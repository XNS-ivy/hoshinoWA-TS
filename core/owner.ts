import fs from 'fs/promises'
import path from 'path'
import { convertLID } from '@local_modules/whatsapp/msg-processing'
import { type WASocket } from 'baileys'

export interface IOwnerEntry {
    lid: string
    level: 'master' | 'owner'
}

export interface IOwnerResult {
    level: 'master' | 'owner'
}

export class OwnerHandler {
    private dbPath = path.resolve('./databases/owner.json')
    private sock: WASocket | null = null

    private async readDB(): Promise<IOwnerEntry[]> {
        try {
            const raw = await fs.readFile(this.dbPath, 'utf-8')
            return JSON.parse(raw) as IOwnerEntry[]
        } catch {
            return []
        }
    }

    private async writeDB(data: IOwnerEntry[]): Promise<void> {
        await fs.mkdir(path.dirname(this.dbPath), { recursive: true })
        await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8')
    }

    async init(socket: WASocket): Promise<void> {
        this.sock = socket
        try {
            const rawLid = this.sock?.user?.lid ?? null
            const masterLid = convertLID(rawLid)
            if (!masterLid) {
                logger.log('Owner init: Cannot retrieve bot LID', 'WARN', 'owner')
                return
            }

            const db = await this.readDB()
            const alreadyExists = db.some(o => o.lid === masterLid && o.level === 'master')
            if (!alreadyExists) {
                const filtered = db.filter(o => o.level !== 'master')
                filtered.unshift({ lid: masterLid, level: 'master' })
                await this.writeDB(filtered)
                logger.log(`Master owner set: ${masterLid}`, 'INFO', 'owner')
            }
        } catch (err: any) {
            logger.log(`Owner init failed: ${err?.message}`, 'ERROR', 'owner')
        }
    }

    async isOwner(lid: string): Promise<IOwnerResult | false> {
        try {
            const clean = convertLID(lid)
            if (!clean) return false
            const db = await this.readDB()
            const found = db.find(o => o.lid === clean)
            return found ? { level: found.level } : false
        } catch {
            return false
        }
    }

    async addOwner(lid: string, level: 'owner' | 'master'): Promise<void> {
        const clean = convertLID(lid)
        if (!clean) throw new Error('Invalid LID')
        const db = await this.readDB()
        const exists = db.some(o => o.lid === clean)
        if (exists) throw new Error(`Owner ${clean} already registered`)
        db.push({ lid: clean, level: level })
        await this.writeDB(db)
    }

    async removeOwner(lid: string): Promise<void> {
        const clean = convertLID(lid)
        if (!clean) throw new Error('Invalid LID')
        const db = await this.readDB()
        const entry = db.find(o => o.lid === clean)
        if (!entry) throw new Error(`Owner ${clean} not found`)
        if (entry.level === 'master') throw new Error('Cannot delete master owner')
        const filtered = db.filter(o => o.lid !== clean)
        await this.writeDB(filtered)
    }

    async getAll(): Promise<IOwnerEntry[]> {
        return this.readDB()
    }
}

export const ownerHandler = new OwnerHandler()