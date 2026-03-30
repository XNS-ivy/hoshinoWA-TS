import fs from 'fs'
import path from 'path'

const bannerPath = path.resolve(__dirname, '../../media/images/hoshino-banner.jpeg')

import commandHandler from '@core/commands'
import { config } from '@core/bot-config'

export default {
    name: 'menu',
    access: 'regular',
    usage: ['menu', 'menu <command>', 'menu usage <command>'],
    async execute(args, { msg, socket, whoAMI }) {
        const prefix = await config.getConfig('prefix')
        const commands = await commandHandler.getCommandMapOnly(whoAMI, msg.isOnGroup)

        const cmdMap = new Map(
            commands.map(c => [getPrimaryName(c), c])
        )

        if (args.length === 1 && args[0]) {
            const target = cmdMap.get(args[0])
            if (!target) {
                return socket.sendMessage(msg.remoteJid, {
                    text: `❌ Command *${args[0]}* not found`
                })
            }
            return socket.sendMessage(msg.remoteJid, {
                text: renderCommandDetail(target, prefix)
            })
        }

        if (args.length === 2 && args[0] === 'usage' && args[1]) {
            const target = cmdMap.get(args[1])
            if (!target) {
                return socket.sendMessage(msg.remoteJid, {
                    text: `❌ Command *${args[1]}* not found`
                })
            }

            const usages = renderUsage(target.usage, getPrimaryName(target))
            return socket.sendMessage(msg.remoteJid, {
                text:
                    `🧾 *Usage ${getPrimaryName(target)}:*\n` +
                    usages.map(u => `• ${u}`).join('\n')
            })
        }

        const map = new Map<string, ICommand[]>()
        for (const cmd of commands) {
            const key = cmd.category ?? cmd.access ?? 'general'
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(cmd)
        }

        const sortedMap = new Map(
            [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
        )

        let text = `📜 *BOT MENU*\n\n`

        for (const [category, cmds] of sortedMap) {
            const sorted = cmds.sort((a, b) =>
                getPrimaryName(a).localeCompare(getPrimaryName(b))
            )

            text += `╔ 📁 *${category.toUpperCase()}*\n`
            for (const c of sorted) {
                text += `║ • ${prefix}${getPrimaryName(c)}\n`
            }
            text += `╚══════════\n\n`
        }

        const selfName = getPrimaryName(this as unknown as ICommand)
        text += `Type *${prefix}${selfName} <command>* for details\n`
        text += `Type *${prefix}${selfName} usage <command>* for usage\n`
        text += `Bot prefix : " ${prefix} "\n`
        text += `\nTotal: ${commands.length} commands`

        const thumbnail = fs.existsSync(bannerPath)
            ? fs.readFileSync(bannerPath)
            : undefined

        await socket.sendMessage(msg.remoteJid, {
            text,
            contextInfo: {
                externalAdReply: {
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnail: thumbnail,
                    title: await config.getConfig('name') ?? 'Hoshino Bot',
                    body: `Prefix: " ${prefix} " • ${commands.length} Commands Online`,
                }
            }
        }, { quoted: msg.raw })
    },
} as ICommand

function getPrimaryName(cmd: ICommand): string {
    return Array.isArray(cmd.name) ? cmd.name[0]! : cmd.name as string
}

function renderUsage(usage: ICommand['usage'], name: string): string[] {
    if (!usage) return [name]
    if (typeof usage === 'string') return [usage]
    if (Array.isArray(usage)) return usage
    if (typeof usage === 'function') {
        const res = usage()
        return Array.isArray(res) ? res : [String(res)]
    }
    return [name]
}

function renderCommandDetail(cmd: ICommand, prefix: string): string {
    const lines: string[] = []
    const primaryName = getPrimaryName(cmd)

    lines.push(`📌 *Command:* ${primaryName}`)

    if (Array.isArray(cmd.name) && cmd.name.length > 1) {
        lines.push(`🔀 *Alias:* ${cmd.name.slice(1).join(', ')}`)
    }

    lines.push(`🔐 *Access:* ${Array.isArray(cmd.access) ? cmd.access.join(', ') : cmd.access ?? 'regular'}`)
    lines.push(`📁 *Category:* ${cmd.category ?? cmd.access ?? 'general'}`)

    if (cmd.inGroup) {
        lines.push(`👥 *Group Only:* yes`)
        if (cmd.inGroupAccess) {
            lines.push(`🛡 *Group Role:* ${cmd.inGroupAccess}`)
        }
    }

    const usages = renderUsage(cmd.usage, primaryName)
    lines.push(`\n🧾 *Usage:*`)
    for (const u of usages) {
        lines.push(`• ${prefix}${u}`)
    }

    if (cmd.args?.length) {
        lines.push(`\n📥 *Args:* ${cmd.args.join(', ')}`)
    }

    return lines.join('\n')
}