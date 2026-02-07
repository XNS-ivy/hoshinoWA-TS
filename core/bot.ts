import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } from 'baileys'
import type { WASocket, AuthenticationState } from 'baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import { start } from '@utils/socket-starter'
import { message, type IMessageFetch } from '@local_modules/whatsapp/msg-processing'
import command from '@core/commands'
import NodeCache from 'node-cache'
import { ImprovedAuth } from '@local_modules/whatsapp/auth'

class bot {
    private static groupCache = new NodeCache({ stdTTL: 30 * 60, useClones: false, deleteOnExpire: true, maxKeys: 200, })
    private sock: null | WASocket
    private usePairingCode: boolean
    private phoneNumber: string | null | undefined
    private state: null | AuthenticationState
    private saveCreds: (() => Promise<void>) | null
    private autodie: number
    private static command = command
    private static maxAutoDie: number = (Number(process.env.MAX_DIE_SOCKET) <= 0 ||
        !Number.isNaN(process.env.MAX_DIE_SOCKET)) ? 2 : Number(process.env.MAX_DIE_SOCKET)
    private static authFile: string = (String(process.env.AUTH_FILE_NAME) == '' ||
        !String(process.env.AUTH_FILE_NAME)) ? 'auth' : String(process.env.AUTH_FILE_NAME)
    constructor() {
        this.state = null
        this.sock = null
        this.usePairingCode = false
        this.phoneNumber = null
        this.saveCreds = null
        this.autodie = 0
    }
    async init(pairingCode: boolean = false, phoneNumber?: string) {
        const auth = new ImprovedAuth(bot.authFile)
        this.state = auth.state
        this.saveCreds = async () => auth.saveCreds()
        this.usePairingCode = pairingCode
        this.phoneNumber = phoneNumber

        await this.start()
    }

    private async start() {
        if (!this.state || !this.saveCreds) return
        this.sock = makeWASocket({
            auth: this.state,
            logger: pino({ level: 'silent' }),
            browser: Browsers.appropriate('Google Chrome'),
            emitOwnEvents: false,
            generateHighQualityLinkPreview: true,
            cachedGroupMetadata: async (jid) => await bot.groupCache.get(jid),
        })
        await this.Events()
    }
    private async Events() {
        if (!this.sock) return

        // event savecreds
        if (this.saveCreds) this.sock?.ev.on('creds.update', this.saveCreds)

        // evemt message
        this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type == 'notify') {
                for (const msg of messages) {
                    const chat = await message.fetch(msg)
                    if (chat) {
                        logger.log('Got Notify Message!', 'INFO', 'socket')
                        if (chat.commandContent) await this.message(chat)
                    }
                }
            }

            if (type == 'append') {
                for (const msg of messages) {
                    const chat = await message.fetch(msg)
                    if (chat) {
                        logger.log('Bot Append Message!', 'INFO', 'socket')
                        if (chat.commandContent) await this.message(chat)
                    }
                }
            }
        })

        // event connection

        this.sock.ev.on('connection.update', async (connectionState) => {
            const { connection, qr, lastDisconnect } = connectionState
            if (qr && this.usePairingCode == false) {
                qrcode.generate(qr, { small: true })
                this.autodie++
            }
            if (!!qr && this.usePairingCode == true && this.phoneNumber && this.sock?.user?.status == undefined) {
                try {
                    setTimeout(() => {
                        logger.log('Attempting Connection Using Pairing Code', 'INFO', 'socket')
                    }, 1000)
                    await this.sock?.requestPairingCode(this.phoneNumber).then((code) => {
                        logger.log(`Pairing Code : ${code.split('').join('-')}`, 'INFO', 'socket')
                        this.autodie++
                    })
                } catch (error) {
                    logger.log('Cannot Request Pairing Code! Check Your Phone Number Correctly', 'ERROR', 'socket')
                }
            }
            switch (connection) {
                case 'open':
                    logger.log(`Connected With : ${this.sock?.user?.name}`, 'INFO', 'socket')
                    break
                case 'close': {
                    const disconnected = (lastDisconnect?.error && 'output' in lastDisconnect.error)
                        ? (lastDisconnect.error as Boom).output?.statusCode
                        : undefined
                    logger.log(`Disconnected : ${lastDisconnect?.error?.message}`, 'WARN', 'socket')

                    switch (disconnected) {
                        case DisconnectReason.loggedOut:
                        case DisconnectReason.forbidden:
                            this.sock?.logout()
                            logger.log('Deleting Socket Creds', 'WARN', 'socket')
                            fs.rmSync(bot.authFile, { recursive: true })
                            setTimeout(async () => { await start() }, 1000)
                            break
                        case DisconnectReason.restartRequired:
                        case DisconnectReason.connectionLost:
                        case DisconnectReason.unavailableService:
                        case DisconnectReason.connectionClosed:
                        case DisconnectReason.multideviceMismatch:
                        case DisconnectReason.connectionReplaced:
                        case DisconnectReason.badSession:
                            await start()
                            break
                        default:
                            break
                    }
                    break
                }
                case 'connecting':
                    this.autodie = 0
                    if (this.sock?.user == undefined) {
                        logger.log(`Attempting Connecting Method : ${this.usePairingCode ? 'Pairing Code' : 'QR Code'}`, 'INFO', 'socket')
                    } else {
                        logger.log('Connecting...', 'INFO', 'socket')
                    }
                    break
                default:
                    break
            }
        })
    }
    private async message(msg: IMessageFetch) {
        logger.log('Prepare to execute command', 'INFO', 'socket')
        if (this.sock) bot.command.execute(msg, this.sock)
    }
    async checkDie() {
        if (this.sock?.user == undefined) {
            if (this.autodie >= bot.maxAutoDie) {
                logger.log('Terminate Program Because No Connection To Whatapp Socket', 'INFO', 'socket')
                setTimeout(() => { process.exit(1) }, 500)
            }
        }
    }
}
const sock = new bot()
export default sock