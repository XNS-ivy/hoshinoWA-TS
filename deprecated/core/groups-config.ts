import fs from 'fs/promises'
import path from 'path'

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface IGroupConfig {
    welcome: boolean
    antiDelete: boolean
    antiEdit: boolean
    welcomeMessage: string
}

export interface IGroupConfigDB {
    [groupJid: string]: IGroupConfig
}

const DEFAULT_CONFIG: IGroupConfig = {
    welcome: false,
    antiDelete: false,
    antiEdit: false,
    welcomeMessage: 'Welcome {name} to {group}! 👋\nYou are member #{count}.',
}

// ============================================================
// GROUP CONFIG CLASS
// ============================================================

export class GroupConfig {
    private dbPath = path.resolve('./databases/groupconfig.json')

    // ── DB HELPERS ────────────────────────────────────────────

    private async readDB(): Promise<IGroupConfigDB> {
        try {
            const raw = await fs.readFile(this.dbPath, 'utf-8')
            return JSON.parse(raw) as IGroupConfigDB
        } catch {
            return {}
        }
    }

    private async writeDB(data: IGroupConfigDB): Promise<void> {
        await fs.mkdir(path.dirname(this.dbPath), { recursive: true })
        await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8')
    }

    // ── GET ───────────────────────────────────────────────────

    async getConfig(groupJid: string): Promise<IGroupConfig> {
        const db = await this.readDB()
        return db[groupJid] ?? { ...DEFAULT_CONFIG }
    }

    async getAllConfig(): Promise<IGroupConfigDB> {
        return this.readDB()
    }

    // ── PRIVATE SETTER ────────────────────────────────────────

    private async updateConfig(groupJid: string, patch: Partial<IGroupConfig>): Promise<IGroupConfig> {
        const db = await this.readDB()
        const existing = db[groupJid] ?? { ...DEFAULT_CONFIG }
        db[groupJid] = { ...existing, ...patch }
        await this.writeDB(db)
        return db[groupJid]!
    }

    // ── WELCOME ───────────────────────────────────────────────

    async setWelcome(groupJid: string, enabled: boolean): Promise<void> {
        await this.updateConfig(groupJid, { welcome: enabled })
    }

    async setWelcomeMessage(groupJid: string, message: string): Promise<void> {
        await this.updateConfig(groupJid, { welcomeMessage: message })
    }

    // ── ANTI DELETE ───────────────────────────────────────────

    async setAntiDelete(groupJid: string, enabled: boolean): Promise<void> {
        await this.updateConfig(groupJid, { antiDelete: enabled })
    }

    // ── ANTI EDIT ─────────────────────────────────────────────

    async setAntiEdit(groupJid: string, enabled: boolean): Promise<void> {
        await this.updateConfig(groupJid, { antiEdit: enabled })
    }

    // ── WELCOME MESSAGE RENDERER ──────────────────────────────
    // Variables: {name}, {group}, {count}

    renderWelcome(template: string, vars: {
        name: string
        group: string
        count: number
    }): string {
        return template
            .replace(/{name}/g, vars.name)
            .replace(/{group}/g, vars.group)
            .replace(/{count}/g, String(vars.count))
    }
}

export const groupConfig = new GroupConfig()