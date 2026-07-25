import { groupConfig } from '@core/groups-config'
import { config } from '@core/bot-config'

const prefix = await config.getConfig('prefix')

export default {
    name: ['group-config', 'gc'],
    access: 'regular' as const,
    inGroup: true,
    inGroupAccess: 'admin' as const,
    usage: [
        'group-config',
        'group-config welcome <on|off>',
        'group-config antidelete <on|off>',
        'group-config antiedit <on|off>',
        'group-config welcome-message <text>',
    ],
    category: 'group',

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        if (whoAMI.groupRole !== 'admin' && !whoAMI.ownerRole) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ Only group admins can use this command.'
            }, { quoted: msg.raw })
        }

        const groupJid = msg.remoteJid
        const cfg = await groupConfig.getConfig(groupJid)

        // Tanpa args → tampilkan status config
        if (args.length === 0) {
            return socket.sendMessage(msg.remoteJid, {
                text:
                    `⚙️ *Group Config*\n\n` +
                    `👋 Welcome       : ${cfg.welcome ? '✅ ON' : '❌ OFF'}\n` +
                    `🗑 Anti Delete   : ${cfg.antiDelete ? '✅ ON' : '❌ OFF'}\n` +
                    `✏️ Anti Edit     : ${cfg.antiEdit ? '✅ ON' : '❌ OFF'}\n\n` +
                    `📝 *Welcome Message:*\n${cfg.welcomeMessage}\n\n` +
                    `*Variables:* {name}, {group}, {count}\n\n` +
                    `Usage:\n` +
                    `• ${prefix}gc welcome on/off\n` +
                    `• ${prefix}gc antidelete on/off\n` +
                    `• ${prefix}gc antiedit on/off\n` +
                    `• ${prefix}gc welcome-message <text>`
            }, { quoted: msg.raw })
        }

        const [sub, ...rest] = args
        const value = rest[0]?.toLowerCase()

        switch (sub?.toLowerCase()) {

            // ── WELCOME ───────────────────────────────────────
            case 'welcome': {
                if (value !== 'on' && value !== 'off') {
                    return socket.sendMessage(msg.remoteJid, {
                        text: `❌ Usage: ${prefix}gc welcome <on|off>`
                    }, { quoted: msg.raw })
                }
                const enabled = value === 'on'
                await groupConfig.setWelcome(groupJid, enabled)
                return socket.sendMessage(msg.remoteJid, {
                    text: `👋 Welcome message ${enabled ? '✅ enabled' : '❌ disabled'}.`
                }, { quoted: msg.raw })
            }

            // ── ANTI DELETE ───────────────────────────────────
            case 'antidelete': {
                if (value !== 'on' && value !== 'off') {
                    return socket.sendMessage(msg.remoteJid, {
                        text: `❌ Usage: ${prefix}gc antidelete <on|off>`
                    }, { quoted: msg.raw })
                }
                const enabled = value === 'on'
                await groupConfig.setAntiDelete(groupJid, enabled)
                return socket.sendMessage(msg.remoteJid, {
                    text: `🗑 Anti delete ${enabled ? '✅ enabled' : '❌ disabled'}.`
                }, { quoted: msg.raw })
            }

            // ── ANTI EDIT ─────────────────────────────────────
            case 'antiedit': {
                if (value !== 'on' && value !== 'off') {
                    return socket.sendMessage(msg.remoteJid, {
                        text: `❌ Usage: ${prefix}gc antiedit <on|off>`
                    }, { quoted: msg.raw })
                }
                const enabled = value === 'on'
                await groupConfig.setAntiEdit(groupJid, enabled)
                return socket.sendMessage(msg.remoteJid, {
                    text: `✏️ Anti edit ${enabled ? '✅ enabled' : '❌ disabled'}.`
                }, { quoted: msg.raw })
            }

            // ── WELCOME MESSAGE ───────────────────────────────
            case 'welcome-message': {
                if (rest.length === 0) {
                    return socket.sendMessage(msg.remoteJid, {
                        text:
                            `❌ Please provide a welcome message.\n\n` +
                            `Usage: ${prefix}gc welcome-message <text>\n\n` +
                            `*Variables:*\n` +
                            `• {name} → mentioned member\n` +
                            `• {group} → group name\n` +
                            `• {count} → total members\n\n` +
                            `*Current:*\n${cfg.welcomeMessage}`
                    }, { quoted: msg.raw })
                }
                const newMessage = rest.join(' ')
                await groupConfig.setWelcomeMessage(groupJid, newMessage)
                return socket.sendMessage(msg.remoteJid, {
                    text:
                        `✅ *Welcome message updated!*\n\n` +
                        `📝 *Preview:*\n${newMessage}`
                }, { quoted: msg.raw })
            }
            case 'all': {
                if (!whoAMI.ownerRole) {
                    return socket.sendMessage(msg.remoteJid, {
                        text: '❌ Only bot owner can view all group configs.'
                    }, { quoted: msg.raw })
                }

                const allCfg = await groupConfig.getAllConfig()
                const entries = Object.entries(allCfg)

                if (entries.length === 0) {
                    return socket.sendMessage(msg.remoteJid, {
                        text: '📋 No group config found.'
                    }, { quoted: msg.raw })
                }

                let text = `📋 *All Group Configs (${entries.length})*\n\n`
                for (const [jid, cfg] of entries) {
                    text +=
                        `🏘 \`${jid}\`\n` +
                        `   👋 Welcome     : ${cfg.welcome ? '✅' : '❌'}\n` +
                        `   🗑 Anti Delete : ${cfg.antiDelete ? '✅' : '❌'}\n` +
                        `   ✏️ Anti Edit   : ${cfg.antiEdit ? '✅' : '❌'}\n\n`
                }

                return socket.sendMessage(msg.remoteJid, {
                    text
                }, { quoted: msg.raw })
            }
            default:
                return socket.sendMessage(msg.remoteJid, {
                    text:
                        `❌ Unknown subcommand: *${sub}*\n\n` +
                        `Available:\n` +
                        `• ${prefix}gc welcome <on|off>\n` +
                        `• ${prefix}gc antidelete <on|off>\n` +
                        `• ${prefix}gc antiedit <on|off>\n` +
                        `• ${prefix}gc welcome-message <text>`
                }, { quoted: msg.raw })
        }
    }
} as ICommand