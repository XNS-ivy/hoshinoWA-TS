import path from 'path'
import fs from 'fs'
import { initAuthCreds, BufferJSON } from 'baileys'
import NodeCache from 'node-cache'

import type {
    AuthenticationState,
    SignalDataTypeMap,
    SignalDataSet,
} from 'baileys'

export class ImprovedAuth {
    private baseDir: string
    private credsPath: string
    private keyDirPath: string
    private cache: NodeCache
    private creds: any
    private logger = logger
    private timers: Record<string, any> = {}

    constructor(baseDir: `./${string}` | string = './auth') {
        this.baseDir = baseDir
        this.credsPath = path.join(this.baseDir, 'creds.json')
        this.keyDirPath = path.join(this.baseDir, 'keys')

        fs.mkdirSync(this.keyDirPath, { recursive: true })
        this.cache = new NodeCache({ stdTTL: 1800, checkperiod: 600, useClones: false })
        this.creds = this.loadAuth(this.credsPath) || initAuthCreds()
    }

    get keysDir() { return this.keyDirPath }

    private sanitizeFileName(name: string) {
        return name.replace(/[:<>"/\\|?*]/g, '_')
    }

    private loadAuth(file: string) {
        try {
            if (fs.existsSync(file)) {
                return JSON.parse(fs.readFileSync(file, 'utf-8'), BufferJSON.reviver)
            }
        } catch (e) {
            logger.log(`Failed to read ${file}`, 'INFO', 'auth')
        }
        return null
    }

    private loadJSON(file: string) {
        return JSON.parse(fs.readFileSync(file, 'utf-8'))
    }

    private saveJSON(file: string, data: any) {
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2))
        fs.renameSync(file + '.tmp', file)
    }

    private saveAuth(file: string, data: any) {
        try {
            const baseName = this.sanitizeFileName(path.basename(file))
            const safeFile = path.join(path.dirname(file), baseName)
            fs.writeFileSync(safeFile + '.tmp', JSON.stringify(data, BufferJSON.replacer, 2))
            fs.renameSync(safeFile + '.tmp', safeFile)
        } catch {
            logger.log(`Failed to save file`, 'ERROR', 'auth')
        }
    }
    private deleteFile(file: string) {
        try { if (fs.existsSync(file)) fs.unlinkSync(file) } catch { }
    }
    private isNullLike(v: any) {
        return v === null || v === undefined
    }
    saveCreds = () => this.saveAuth(this.credsPath, this.creds)

    keys: AuthenticationState['keys'] = {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
            const result: Partial<Record<string, SignalDataTypeMap[T]>> = {}

            for (const id of ids) {
                const safeKey = `${String(type)}-${id}`.replace(/[:<>"/\\|?*]/g, '_')
                let value = this.cache.get<SignalDataTypeMap[T]>(safeKey)

                const file = path.join(this.keysDir, `${safeKey}.json`)
                if (!value && fs.existsSync(file)) {
                    try { value = this.loadJSON(file) as SignalDataTypeMap[T] } catch { /* ignore */ }
                    if (value) this.cache.set(safeKey, value)
                }

                if (value !== undefined) {
                    result[id] = value
                }
            }
            return result as Record<string, SignalDataTypeMap[T]>
        },

        set: async (data: SignalDataSet) => {
            for (const type of Object.keys(data) as (keyof SignalDataSet)[]) {
                const sub = data[type] as SignalDataSet[typeof type]
                if (!sub || typeof sub !== 'object') {
                    continue
                }

                for (const id of Object.keys(sub)) {
                    const value = (sub as any)[id]
                    const safeKey = `${String(type)}-${id}`.replace(/[:<>"/\\|?*]/g, '_')
                    const file = path.join(this.keysDir, `${safeKey}.json`)

                    if (this.isNullLike(value)) {
                        this.cache.del(safeKey)
                        this.deleteFile(file)
                        continue
                    }

                    this.cache.set(safeKey, value)

                    const timerKey = `_save_${safeKey}`
                    clearTimeout(this.timers[timerKey])
                    this.timers[timerKey] = setTimeout(() => {
                        try {
                            this.saveJSON(file, value)
                        } catch (e) {
                            logger.log(`Failed to save key ${safeKey}`, 'ERROR', 'auth')
                        }
                    }, 300)
                }
            }
        }
    }
    get state(): AuthenticationState {
        return {
            creds: this.creds,
            keys: this.keys
        }
    }
}