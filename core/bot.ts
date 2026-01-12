import { makeWASocket, useMultiFileAuthState } from 'baileys'
import type { WASocket, AuthenticationState } from 'baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'

class bot {
    private sock: null | WASocket
    private usePairingCode: boolean
    private phoneNumber: string | null
    private state: null | AuthenticationState
    private saveCreds: (() => Promise<void>) | null
    constructor() {
        this.state = null
        this.sock = null
        this.usePairingCode = false
        this.phoneNumber = null
        this.saveCreds = null
    }
    async init(pairingCode: boolean = false, phoneNumber: string | null) {
        const { saveCreds, state } = await useMultiFileAuthState('auth')
        this.state = state
        this.saveCreds = saveCreds
        this.usePairingCode = pairingCode
        this.phoneNumber = phoneNumber

        await this.start()
        await this.connectionHandle()
        await this.Events()
    }
    private async start() {
        if (this.saveCreds == null || this.state == null) return
        this.sock = makeWASocket({
            auth: this.state,
            logger: pino({ level: 'silent' })
        })
    }
    private async connectionHandle() {
        this.sock?.ev.on('connection.update', (connectionState) => {
            const { connection, qr } = connectionState
            if (qr && this.usePairingCode == false) {
                qrcode.generate(qr, { small: true })
            }
            if (!!qr && this.usePairingCode == true && this.phoneNumber && this.sock?.user?.status == undefined) this.sock?.requestPairingCode(this.phoneNumber).then((code) => {
                console.log(code)
            })
            switch (connection) {
                case 'open':
                    logger.log(`Connected With : ${this.sock?.user?.name}`, 'INFO', 'socket')
                    break
                case 'close':

                    break
                case 'connecting':
                    if (this.sock?.user?.status == undefined) {
                        // logger.log(`Attempting Connecting Method : ${isPair ? 'Pairing Code' : 'QR Code'}`, 'INFO', 'socket')
                    } else {
                        logger.log('Connecting...', 'INFO', 'socket')
                    }
                    break
                default:
                    break
            }
        })
    }
    private async Events() {
        if (this.saveCreds) this.sock?.ev.on('creds.update', this.saveCreds)

    }
    private async message() { }

}
const sock = new bot()
export default sock