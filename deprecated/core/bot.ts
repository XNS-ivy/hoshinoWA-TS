import { makeWASocket, DisconnectReason, Browsers, fetchLatestWaWebVersion } from 'baileys'
import type { WASocket, AuthenticationState, WAMessage } from 'baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import { start } from '@utils/socket-starter'
import { message, type IMessageFetch } from '@local_modules/whatsapp/msg-processing'
import command from '@core/commands'
import NodeCache from 'node-cache'
import { ImprovedAuth } from '@local_modules/whatsapp/auth'
import { convertLID } from '@local_modules/whatsapp/msg-processing'
import { ownerHandler } from "@core/owner"

// Cache pesan untuk anti delete & anti edit
// key: message.key.id → value: WAMessage lengkap
interface ICachedMessage {
    key: WAMessage['key']
    message: WAMessage['message']
    pushName?: string | null
    participant?: string | null
    remoteJid: string
}

class bot {

    private tradeNotifInterval: Timer | null = null

    private static groupCache = new NodeCache({
        stdTTL: 30 * 60,
        useClones: false,
        deleteOnExpire: true,
        maxKeys: 200,
    })

    private static messageCache = new NodeCache({
        stdTTL: 60 * 60,
        useClones: false,
        deleteOnExpire: true,
        maxKeys: 5000
    })

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
        // const auth = await useMultiFileAuthState(bot.authFile)
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
            version: (await fetchLatestWaWebVersion()).version
        })
        await this.Events()
    }

    private async Events() {
        if (!this.sock) return

        if (this.saveCreds) this.sock.ev.on('creds.update', this.saveCreds)

        // ── MESSAGES UPSERT ───────────────────────────────────
        this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify' && type !== 'append') return
            for (const msg of messages) {
                if (!msg.key?.id || !msg.key?.remoteJid) continue
                const chat = await message.fetch(msg)
                console.log(chat)
                const isGroup = msg.key.remoteJid.endsWith('@g.us')
                if (isGroup && msg.message) {
                    const cacheId = `${msg.key.remoteJid}_${msg.key.id}`
                    if (cacheId) {
                        bot.messageCache.set(cacheId, {
                            key: msg.key,
                            message: msg.message,
                            pushName: msg.pushName,
                            participant: msg.key.participant,
                            remoteJid: msg.key.remoteJid
                        })
                    }
                }
                if (msg.message?.protocolMessage?.type === 0) {
                    if (!msg.key.remoteJid?.endsWith('@g.us')) return
                    const { groupConfig } = await import('@core/groups-config')
                    const config = await groupConfig.getConfig(msg.key.remoteJid)
                    if (!config.antiDelete) return
                    const deletedKey = msg.message.protocolMessage.key
                    const deletedId = deletedKey?.id
                    if (!deletedId) return
                    const cacheId = `${msg.key.remoteJid}_${deletedId}`
                    const cached = bot.messageCache.get<ICachedMessage>(cacheId)
                    if (!cached) {
                        return
                    }
                    const groupJid = msg.key.remoteJid
                    if (!this.sock) return

                    await this.sock.sendMessage(groupJid, {
                        text: `⚠️ *Anti Delete Active*\nDeleted messages are successfully recovered`
                    })
                    await this.sock.sendMessage(groupJid, {
                        forward: cached
                    })
                }
                if (chat) {
                    logger.log(`Bot ${type} Message!`, 'INFO', 'socket')
                    if (chat.commandContent) await this.message(chat)
                }
            }
        })

        // ── GROUP PARTICIPANTS UPDATE (welcome) ───────────────
        this.sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
            if (action !== 'add') return
            if (!this.sock) return

            const { groupConfig } = await import('@core/groups-config')
            const config = await groupConfig.getConfig(id)
            if (!config.welcome) return

            try {
                const meta = await this.sock.groupMetadata(id)

                for (const participant of participants) {
                    const participantJid = participant.id
                    const rendered = groupConfig.renderWelcome(config.welcomeMessage, {
                        name: `@${participantJid.replace('@s.whatsapp.net', '').replace('@lid', '')}`,
                        group: meta.subject,
                        count: meta.participants.length,
                    })

                    await this.sock.sendMessage(id, {
                        text: rendered,
                        mentions: [participantJid],
                    })
                }
            } catch (err: any) {
                logger.log(`Welcome message failed: ${err?.message}`, 'WARN', 'group-config')
            }
        })

        // ── CONNECTION UPDATE ─────────────────────────────────
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
                    logger.log(`Connected With : ${this.sock?.user?.name} Lid : ${convertLID(this.sock?.user?.lid ?? null)}`, 'INFO', 'socket')
                    if (this.sock) {
                        await ownerHandler.init(this.sock)
                        try {
                            const { cryptoTrade } = await import('./minigames/cryptoTrade')
                            const allOwners = await ownerHandler.getAll()
                            await cryptoTrade.initOwnerWallets(allOwners)
                            logger.log('CryptoTrade owner wallets initialized', 'INFO', 'cryptotrade')
                        } catch (err: any) {
                            logger.log(`CryptoTrade init failed: ${err?.message}`, 'WARN', 'cryptotrade')
                        }
                        this.startTradeNotifLoop()
                    }
                    break

                case 'close':
                    this.stopTradeNotifLoop()
                    {
                        const disconnected = (lastDisconnect?.error && 'output' in lastDisconnect.error)
                            ? (lastDisconnect.error as Boom).output?.statusCode
                            : undefined
                        logger.log(`Disconnected : ${lastDisconnect?.error?.message}`, 'WARN', 'socket')

                        switch (disconnected) {
                            case DisconnectReason.loggedOut:
                            case DisconnectReason.forbidden:
                                logger.log('Deleting Socket Creds', 'WARN', 'socket')
                                fs.rmSync(bot.authFile, { recursive: true, force: true })
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
                                if (this.autodie < bot.maxAutoDie) {
                                    logger.log(`Unknown disconnect (${disconnected}), attempting reconnect...`, 'WARN', 'socket')
                                    await start()
                                } else {
                                    logger.log('Max reconnect attempts reached', 'FATAL', 'socket')
                                    setTimeout(() => process.exit(1), 500)
                                }
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
        try {
            if (this.sock) bot.command.execute(msg, this.sock)
        } catch (e) {
            logger.log(`Generally error executing commands : ${e}`, 'ERROR', 'socket')
        }
    }

    async checkDie() {
        if (this.sock?.user == undefined) {
            if (this.autodie >= bot.maxAutoDie) {
                logger.log('Terminate Program Because No Connection To Whatapp Socket', 'FATAL', 'socket')
                setTimeout(() => { process.exit(1) }, 500)
            }
        }
    }

    private async startTradeNotifLoop() {
        if (this.tradeNotifInterval) return
        const { cryptoTrade } = await import('./minigames/cryptoTrade')
        this.tradeNotifInterval = setInterval(async () => {
            if (!this.sock) return
            try {
                const coins = await cryptoTrade.getCoins()
                for (const coin of coins) {
                    const notifications = await cryptoTrade.checkAlerts(coin.id)
                    for (const notif of notifications) {
                        if (!notif.phoneJid) continue
                        try {
                            await this.sock.sendMessage(notif.phoneJid, { text: notif.message })
                        } catch (err: any) {
                            logger.log(`Alert DM failed to ${notif.phoneJid}: ${err?.message}`, 'WARN', 'cryptotrade')
                        }
                    }
                }
            } catch (err: any) {
                logger.log(`Trade notif loop error: ${err?.message}`, 'WARN', 'cryptotrade')
            }
        }, 5000)
    }

    private stopTradeNotifLoop() {
        if (this.tradeNotifInterval) {
            clearInterval(this.tradeNotifInterval)
            this.tradeNotifInterval = null
        }
    }
}

const sock = new bot()
export default sock