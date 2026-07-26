import type { WASocket } from "baileys"
import { Browsers, makeWASocket } from "baileys"
import { ImprovedAuth } from "./auth"

class WhatsappSocket {
	private sock: null | WASocket = null

	async init(_pairingCode: boolean = false) {}

	async start() {
		const auth = new ImprovedAuth()
		this.sock = makeWASocket({
			auth: auth.state,
			browser: Browsers.appropriate("Google Chrome"),
		})
	}

	getSocket() {
		return this.sock
	}
}

const whatsappSocket = new WhatsappSocket()
export default whatsappSocket
