import fs from "fs"
import path from "path"
import { bot } from "@schemas/bot-configs-base"
import type { IBotConfigSchema } from "@schemas/bot-configs-base"

const filepath = path.resolve(__dirname, "../databases/bot-configs.json")

class BotConfigs {
    private static filepath = filepath
    private data!: IBotConfigSchema

    async init() {
        const defaults = this.defaultConfig()

        if (!fs.existsSync(BotConfigs.filepath)) {
            this.data = defaults
            this.saveConfig()
            return
        }
        const raw = fs.readFileSync(BotConfigs.filepath, "utf-8")
        const saved = JSON.parse(raw) as Partial<IBotConfigSchema>
        this.data = { ...defaults, ...saved }
        const hasNewKeys = (Object.keys(defaults) as Array<keyof IBotConfigSchema>)
            .some(key => !(key in saved))

        if (hasNewKeys) {
            this.saveConfig()
        }
    }

    async getConfig<K extends keyof IBotConfigSchema>(key: K): Promise<IBotConfigSchema[K]> {
        return this.data[key]
    }

    async editConfig<K extends keyof IBotConfigSchema>(
        key: K,
        value: IBotConfigSchema[K]
    ): Promise<void> {
        this.data[key] = value
        this.saveConfig()
    }

    async saveConfig(): Promise<void> {
        fs.writeFileSync(
            BotConfigs.filepath,
            JSON.stringify(this.data, null, 2),
            "utf-8"
        )
    }

    private defaultConfig(): IBotConfigSchema {
        return { ...bot }
    }
}

export const config = new BotConfigs()