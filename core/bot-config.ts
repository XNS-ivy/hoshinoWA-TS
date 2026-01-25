import fs from "fs"
import path from "path"
import { bot } from "@schemas/bot-configs-base"
import type { IBotConfigSchema } from "@schemas/bot-configs-base"

const filepath = path.resolve(__dirname, "../databases/bot-configs.json")

class BotConfigs {
    private static filepath = filepath
    private data!: IBotConfigSchema
    
    async init() {
        if (!fs.existsSync(BotConfigs.filepath)) {
            this.data = await this.defaultConfig()
            this.saveConfig()
            return
        }

        const raw = fs.readFileSync(BotConfigs.filepath, "utf-8")
        this.data = JSON.parse(raw) as IBotConfigSchema
    }

    async getConfig<K extends keyof IBotConfigSchema>(key: K): Promise<IBotConfigSchema[K]> {
        return this.data[key]
    }

    async editConfig<K extends keyof IBotConfigSchema>(
        key: K,
        value: IBotConfigSchema[K]
    ) {
        this.data[key] = value
        this.saveConfig()
    }

    async saveConfig() {
        fs.writeFileSync(
            BotConfigs.filepath,
            JSON.stringify(this.data, null, 2),
            "utf-8"
        )
    }

    private async defaultConfig(): Promise<IBotConfigSchema> {
        return {
            name: bot.name,
            prefix: bot.prefix,
            version: bot.version,
        }
    }
}

export const config = new BotConfigs()