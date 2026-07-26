import fs from "node:fs"
import type { Boom } from "@hapi/boom"
import type { AuthenticationState, WASocket } from "baileys"
import {
	Browsers,
	DisconnectReason,
	fetchLatestWaWebVersion,
	makeWASocket,
} from "baileys"
import pino from "pino"
import qrcode from "qrcode-terminal"
import { ImprovedAuth } from "./auth"
import { convertLID } from "./functions"

class WhatsappSocket {
	private sock: null | WASocket = null
	private static authFile: string = process.env.AUTH_FILE_NAME || "auth"
	private state: null | AuthenticationState = null
	private saveCreds: (() => Promise<void>) | null = null
	private usePairingCode = false
	private phoneNumber: string | null | undefined = null
	private autodie = 0
	private maxAutoDie = 5

	async init(_pairingCode = false, phoneNumber?: string) {
		const auth = new ImprovedAuth(WhatsappSocket.authFile)
		this.state = auth.state
		this.saveCreds = async () => auth.saveCreds()
		this.usePairingCode = _pairingCode
		this.phoneNumber = phoneNumber

		await this.start()
	}

	private async start() {
		if (!this.state || !this.saveCreds) return

		this.sock = makeWASocket({
			auth: this.state,
			browser: Browsers.ubuntu("Chrome"),
			generateHighQualityLinkPreview: true,
			emitOwnEvents: false,
			logger: pino({ level: "silent" }),
			version: (await fetchLatestWaWebVersion()).version,
		})
		await this.baileysEvents()
	}

	private async baileysEvents() {
		if (!this.sock) throw new Error("Socket Not Initialize yet!.")

		if (this.saveCreds) {
			this.sock.ev.on("creds.update", this.saveCreds)
		}

		this.sock.ev.on("connection.update", async (connectionState) => {
			const { connection, qr, lastDisconnect } = connectionState

			if (qr) {
				await this.handleQRCode(qr)
			}

			if (!connection) return

			switch (connection) {
				case "open":
					logger.log(
						`Connected With : ${this.sock?.user?.name} Lid : ${convertLID(this.sock?.user?.lid ?? null)}`,
						"INFO",
						"socket",
					)
					break

				case "close":
					await this.handleDisconnect(lastDisconnect)
					break

				case "connecting":
					this.autodie = 0
					this.logConnectingState()
					break
			}
		})
	}

	private async handleQRCode(qr: string) {
		if (!this.usePairingCode) {
			qrcode.generate(qr, { small: true })
			this.autodie++
			return
		}

		if (!this.phoneNumber || this.sock?.user?.status !== undefined) return

		const cleanNumber = this.phoneNumber.replace(/[^0-9]/g, "")

		try {
			logger.log("Attempting Connection Using Pairing Code", "INFO", "socket")
			await new Promise((resolve) => setTimeout(resolve, 1000))

			const code = await this.sock?.requestPairingCode(cleanNumber)
			if (code) {
				logger.log(
					`Pairing Code : ${code.split("").join("-")}`,
					"INFO",
					"socket",
				)
				this.autodie++
			}
		} catch (_error) {
			logger.log(
				"Cannot Request Pairing Code! Check Your Phone Number Correctly",
				"ERROR",
				"socket",
			)
		}
	}

	private async handleDisconnect(
		lastDisconnect: { error?: Error } | undefined,
	) {
		const error = lastDisconnect?.error
		const statusCode =
			error && "output" in error
				? (error as Boom).output?.statusCode
				: undefined

		logger.log(`Disconnected : ${error?.message}`, "WARN", "socket")

		if (
			statusCode === DisconnectReason.loggedOut ||
			statusCode === DisconnectReason.forbidden
		) {
			logger.log("Deleting Socket Creds", "WARN", "socket")
			fs.rmSync(WhatsappSocket.authFile, {
				recursive: true,
				force: true,
			})
			setTimeout(async () => {
				await this.start()
			}, 1000)
			return
		}

		if (this.isTemporaryDisconnect(statusCode)) {
			await this.start()
			return
		}

		if (this.autodie < this.maxAutoDie) {
			logger.log(
				`Unknown disconnect (${statusCode}), attempting reconnect...`,
				"WARN",
				"socket",
			)
			await this.start()
			return
		}

		logger.log("Max reconnect attempts reached", "FATAL", "socket")
		setTimeout(() => process.exit(1), 500)
	}

	private isTemporaryDisconnect(statusCode?: number): boolean {
		if (!statusCode) return false

		const temporaryReasons = [
			DisconnectReason.restartRequired,
			DisconnectReason.connectionLost,
			DisconnectReason.unavailableService,
			DisconnectReason.connectionClosed,
			DisconnectReason.multideviceMismatch,
			DisconnectReason.connectionReplaced,
			DisconnectReason.badSession,
		]

		return temporaryReasons.includes(statusCode)
	}

	private logConnectingState() {
		if (this.sock?.user !== undefined) {
			logger.log("Connecting...", "INFO", "socket")
			return
		}

		const method = this.usePairingCode ? "Pairing Code" : "QR Code"
		logger.log(`Attempting Connecting Method : ${method}`, "INFO", "socket")
	}
}

const whatsappSocket = new WhatsappSocket()
export default whatsappSocket
