import fs from "node:fs"
import path from "node:path"
import type {
	AuthenticationState,
	SignalDataSet,
	SignalDataTypeMap,
} from "baileys"
import { BufferJSON, initAuthCreds } from "baileys"
import NodeCache from "node-cache"

export class ImprovedAuth {
	private baseDir: string
	private credsPath: string
	private keyDirPath: string
	private cache: NodeCache
	private creds: AuthenticationState["creds"]
	private timers: Record<string, NodeJS.Timeout> = {}

	constructor(baseDir: `./${string}` | string = "./auth") {
		this.baseDir = baseDir
		this.credsPath = path.join(this.baseDir, "creds.json")
		this.keyDirPath = path.join(this.baseDir, "keys")

		fs.mkdirSync(this.keyDirPath, { recursive: true })
		this.cache = new NodeCache({
			stdTTL: 1800,
			checkperiod: 600,
			useClones: false,
		})
		this.creds = this.loadAuth(this.credsPath) || initAuthCreds()
	}

	get keysDir() {
		return this.keyDirPath
	}

	private sanitizeFileName(name: string) {
		return name.replace(/[:<>"/\\|?*]/g, "_")
	}

	private loadAuth(file: string): AuthenticationState["creds"] | null {
		if (!fs.existsSync(file)) return null

		try {
			const content = fs.readFileSync(file, "utf-8")
			const parsed = JSON.parse(content, BufferJSON.reviver)
			if (!parsed) return null
			return parsed
		} catch (e) {
			logger.log(`Failed to read ${file}: ${e}`, "WARN", "auth")
			return null
		}
	}

	private loadKeyFromFile<T>(file: string): T | undefined {
		if (!fs.existsSync(file)) return undefined

		try {
			const content = fs.readFileSync(file, "utf-8")
			return JSON.parse(content, BufferJSON.reviver) as T
		} catch {
			return undefined
		}
	}

	private saveJSON(file: string, data: unknown) {
		fs.mkdirSync(path.dirname(file), { recursive: true })
		fs.writeFileSync(
			`${file}.tmp`,
			JSON.stringify(data, BufferJSON.replacer, 2),
		)
		fs.renameSync(`${file}.tmp`, file)
	}

	private saveAuth(file: string, data: unknown) {
		try {
			const baseName = this.sanitizeFileName(path.basename(file))
			const safeFile = path.join(path.dirname(file), baseName)
			fs.writeFileSync(
				`${safeFile}.tmp`,
				JSON.stringify(data, BufferJSON.replacer, 2),
			)
			fs.renameSync(`${safeFile}.tmp`, safeFile)
		} catch {
			logger.log("Failed to save file", "ERROR", "auth")
		}
	}

	private deleteFile(file: string) {
		if (!fs.existsSync(file)) return

		try {
			fs.unlinkSync(file)
		} catch {
			/* ignore */
		}
	}

	private isNullLike(v: unknown): v is null | undefined {
		return v === null || v === undefined
	}

	private scheduleSaveKey(safeKey: string, file: string, value: unknown) {
		const timerKey = `_save_${safeKey}`
		clearTimeout(this.timers[timerKey])
		this.timers[timerKey] = setTimeout(() => {
			try {
				this.saveJSON(file, value)
			} catch (_e) {
				logger.log(`Failed to save key ${safeKey}`, "ERROR", "auth")
			}
		}, 0)
	}

	saveCreds = async (): Promise<void> => {
		try {
			this.saveAuth(this.credsPath, this.creds)
		} catch (e) {
			logger.log(`Failed to save creds: ${e}`, "ERROR", "auth")
		}
	}

	keys: AuthenticationState["keys"] = {
		get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
			const result: Partial<Record<string, SignalDataTypeMap[T]>> = {}

			for (const id of ids) {
				const safeKey = `${String(type)}-${id}`.replace(/[:<>"/\\|?*]/g, "_")
				let value = this.cache.get<SignalDataTypeMap[T]>(safeKey)

				if (!value) {
					const file = path.join(this.keysDir, `${safeKey}.json`)
					value = this.loadKeyFromFile<SignalDataTypeMap[T]>(file)
					if (value) this.cache.set(safeKey, value)
				}

				if (value === undefined) continue

				result[id] = value
			}
			return result as Record<string, SignalDataTypeMap[T]>
		},

		set: async (data: SignalDataSet) => {
			for (const type of Object.keys(data) as (keyof SignalDataSet)[]) {
				const sub = data[type] as SignalDataSet[typeof type]
				if (!sub || typeof sub !== "object") continue

				const subRecord = sub as Record<string, unknown>
				for (const id of Object.keys(subRecord)) {
					const value = subRecord[id]
					const safeKey = `${String(type)}-${id}`.replace(/[:<>"/\\|?*]/g, "_")
					const file = path.join(this.keysDir, `${safeKey}.json`)

					if (this.isNullLike(value)) {
						this.cache.del(safeKey)
						this.deleteFile(file)
						continue
					}

					this.cache.set(safeKey, value)
					this.scheduleSaveKey(safeKey, file, value)
				}
			}
		},
	}

	get state(): AuthenticationState {
		return {
			creds: this.creds,
			keys: this.keys,
		}
	}
}
