import { type IMessageFetch } from '@local_modules/whatsapp/msg-processing'
import { type WASocket } from 'baileys'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath, pathToFileURL } from "url"
import { ownerHandler } from '@core/owner'

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

        const ownerResult = await ownerHandler.isOwner(msg.lid)
        const ownerRole: 'master' | 'owner' | false = ownerResult ? ownerResult.level : false

        let groupRole: 'admin' | 'member' | 'private' = 'private'
        if (msg.isOnGroup) {
            try {
                const user = (await socket.groupMetadata(msg.remoteJid))
                    .participants.find(p => p.id === msg.lid)
                groupRole = user?.admin ? 'admin' : 'member'
            } catch (err: any) {
                logger.log(`Failed to get group metadata: ${err?.message}`, 'WARN', 'command handler')
                groupRole = 'member'
            }
        }

        const whoAMI: ICTX['whoAMI'] = { groupRole, ownerRole }

        const { cmd, args } = commandContent
        const command = this.commands.get(cmd)
        if (!command) return

        const primaryName = Array.isArray(command.name) ? command.name[0] : command.name

        void command.execute(args, { msg, socket, whoAMI })
        logger.log(`${primaryName} Executed (via: ${cmd})`, 'INFO', 'command handler')
    }
    async initOwner(socket: WASocket): Promise<void> {
        await ownerHandler.init(socket)
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

            const module = await import(pathToFileURL(fullPath).href)
            const command = module.default as ICommand
            if (!command?.name || typeof command.execute !== "function") continue

            const relative = path.relative(this.commandPath, dir)
            const category = relative ? relative.split(path.sep)[0] : 'general'
            command.category = category ?? 'general'

            const names = Array.isArray(command.name) ? command.name : [command.name]
            for (const name of names) {
                this.commands.set(name, command)
            }
        }
    }
    async getCommandMapOnly(whoAMI: ICTX['whoAMI'], isGroup: boolean) {
        const seen = new Set<string>()
        const result: ICommand[] = []

        for (const [, command] of this.commands) {
            const primaryName = Array.isArray(command.name) ? command.name[0]! : command.name as string
            if (seen.has(primaryName)) continue
            seen.add(primaryName)

            if (command.inGroup && !isGroup) continue
            if (isGroup && command.inGroupAccess) {
                if (command.inGroupAccess === 'admin' && whoAMI.groupRole !== 'admin' && !whoAMI.ownerRole) continue
            }
            if (command.access === 'owner' || command.access === 'master') {
                if (!whoAMI.ownerRole) continue
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