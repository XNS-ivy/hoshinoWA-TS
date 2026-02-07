import { type IMessageFetch } from '@local_modules/whatsapp/msg-processing'
import { type WASocket } from 'baileys'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath, pathToFileURL } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class CommandHandling {
    private commandPath = path.resolve(__dirname, "../commands")
    private commands = new Map<string, ICommand>()
    constructor() { }
    async init() {
        await this.loadCommands(this.commandPath)
        logger.log(`Loaded ${this.commands.size} commands`, 'INFO', 'command handler')
    }
    async execute(msg: IMessageFetch, socket: WASocket): Promise<void> {
        const { commandContent } = msg
        if (!commandContent) return
        let whoAMI: {
            role: 'private' | 'admin' | 'member'
        } = { role: 'private' }
        if (msg.isOnGroup) {
            const user = (await socket.groupMetadata(msg.remoteJid)).participants.find(p => p.id === msg.lid)
            const role: 'admin' | 'member' = user?.admin ? 'admin' : 'member'
            whoAMI = {
                role: role
            }
        }

        const { cmd, args } = commandContent
        const command = this.commands.get(cmd)
        if (!command) return
        void command.execute(args, {
            msg,
            socket,
            whoAMI,
        })
        logger.log(`${cmd} Executed`, 'INFO', 'command handler')
    }
    private async loadCommands(dir: string) {
        const files = await fs.readdir(dir, { withFileTypes: true })

        for (const file of files) {
            const fullPath = path.join(dir, file.name)

            if (file.isDirectory()) {
                await this.loadCommands(fullPath)
                continue
            }

            if (!file.name.match(/\.(ts|js)$/)) continue

            const module = await import(
                pathToFileURL(fullPath).href
            )

            const command = module.default as ICommand
            if (!command?.name || typeof command.execute !== "function") continue

            this.commands.set(command.name, command)
        }
    }
    async getCommandMapOnly(
        whoAMI: { role: 'private' | 'admin' | 'member' },
        isGroup: boolean
    ) {
        const result: ICommand[] = []

        for (const [, command] of this.commands) {
            if (command.inGroup && !isGroup) continue
            if (isGroup && command.inGroupAccess) {
                if (
                    command.inGroupAccess === 'admin' &&
                    whoAMI.role !== 'admin'
                ) continue
            }

            result.push(command)
        }

        return result
    }

}

/* export interface ICommand {
    name: string
    execute: (
        args: string[] | null | undefined,
        ctx: ICTX,
    ) => Promise<void> | void
}

export interface ICTX {
    msg: IMessageFetch,
    socket: WASocket,
    whoAMI: {
        role: 'private' | 'admin' | 'member'
    },
} */

const command = new CommandHandling
export default command