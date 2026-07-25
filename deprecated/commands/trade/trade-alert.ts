import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'trade-alert',
    access: 'regular' as const,
    usage: [
        'trade-alert',
        'trade-alert <ID> <TargetPrice>',
        'trade-alert delete <alertId>',
        'trade-alert BTC 800000000',
    ],
    args: ['delete', '<alert>'],
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')
        if (args.length === 0) {
            const alerts = await cryptoTrade.getUserAlerts(msg.lid)

            if (alerts.length === 0) {
                return socket.sendMessage(msg.remoteJid, {
                    text:
                        `🔔 No alerts are installed yet.\n\n` +
                        `Usage: ${prefix}trade-alert <ID> <TargetPrice>\n` +
                        `Example: ${prefix}trade-alert BTC 800000000`
                }, { quoted: msg.raw })
            }

            let text = `🔔 *Alert Installed (${alerts.length})*\n\n`
            for (const a of alerts) {
                const dirEmoji = a.direction === 'above' ? '📈' : '📉'
                const date = new Date(a.createdAt).toLocaleString('id-ID')
                text +=
                    `${dirEmoji} *${a.coin}*\n` +
                    ` 🎯 Target : ${a.targetPrice.toLocaleString()}\n` +
                    ` 📡 Direction : ${a.direction === 'above' ? 'Rise above target' : 'Fall below target'}\n` +
                    ` 🕐 Created : ${date}\n` +
                    ` 🆔 ID : ${a.id}\n\n`
            }

            text += `Use ${prefix}trade-alert delete <ID> to delete an alert..`
            return socket.sendMessage(msg.remoteJid, { text }, { quoted: msg.raw })
        }

        // Delete alert
        if (args[0] === 'delete') {
            const alertId = args[1]
            if (!alertId) {
                return socket.sendMessage(msg.remoteJid, {
                    text: `❌ Enter the alert ID.\nUsage: ${prefix}trade-alert delete <alertId>`
                }, { quoted: msg.raw })
            }

            try {
                await cryptoTrade.deleteAlert(msg.lid, alertId)
                await socket.sendMessage(msg.remoteJid, {
                    text: `✅ Alert successfully deleted.`
                }, { quoted: msg.raw })
            } catch (err: any) {
                await socket.sendMessage(msg.remoteJid, {
                    text: `❌ ${err?.message}`
                }, { quoted: msg.raw })
            }
            return
        }

        const [coinId, rawTarget] = args
        if (!coinId || !rawTarget) {
            return socket.sendMessage(msg.remoteJid, {
                text:
                    `❌ Incorrect format.\n` +
                    `Usage: ${prefix}trade-alert <ID> <TargetPrice>\n` +
                    `Example: ${prefix}trade-alert BTC 800000000`
            }, { quoted: msg.raw })
        }

        const targetPrice = Number(rawTarget)
        if (isNaN(targetPrice) || targetPrice <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Invalid price target.`
            }, { quoted: msg.raw })
        }

        try {
            const alert = await cryptoTrade.setAlert(msg.lid, coinId, targetPrice)
            const dirEmoji = alert.direction === 'above' ? '📈' : '📉'
            const dirText = alert.direction === 'above'
                ? `Notify when the price *rises* to ${targetPrice.toLocaleString()}`
                : `Notify when the price *falls* to ${targetPrice.toLocaleString()}`

            await socket.sendMessage(msg.remoteJid, {
                text:
                    `${dirEmoji} *Alert Installed!*\n\n` +
                    `🪙 Coin : ${alert.coin}\n` +
                    `🎯 Target : ${alert.targetPrice.toLocaleString()}\n` +
                    `📡 ${dirText}\n\n` +
                    `You will be DMed when the price reaches the target.`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand