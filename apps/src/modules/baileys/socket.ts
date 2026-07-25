import {
    makeWASocket,
    Browsers
} from "baileys"

import type {
    WASocket
} from 'baileys'

class WhatsappSocket {
    private sock: null | WASocket = null

    async init(_pairingCode: boolean = false) { }
    async start() {
        this.sock = makeWASocket({
            auth: ,
            browser: Browsers.appropriate('Google Chrome'),

        })
    }
}

const whatsappSocket = new WhatsappSocket()
export default whatsappSocket
