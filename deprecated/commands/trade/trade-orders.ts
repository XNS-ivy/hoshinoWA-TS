import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'trade-orders',
    access: 'regular' as const,
    usage: 'trade-orders',
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')
        try {
            const orders = await cryptoTrade.getPendingOrders(msg.lid)

            if (orders.length === 0) {
                return socket.sendMessage(msg.remoteJid, {
                    text: `📋 There are no pending orders.\n\nUse ${prefix}limit-buy or ${prefix}limit-sell to place orders..`
                }, { quoted: msg.raw })
            }

            let text = `📋 *Pending Orders (${orders.length})*\n\n`
            for (const o of orders) {
                const typeEmoji = o.type === 'buy' ? '🟢 LIMIT BUY' : '🔴 LIMIT SELL'
                const date = new Date(o.createdAt).toLocaleString('id-ID')
                const locked = o.type === 'buy'
                    ? `💵 Locked Funds : ${o.amountCash.toLocaleString()}`
                    : `🪙 Coin Locked : ${o.amountCoin.toLocaleString(undefined, { maximumFractionDigits: 8 })}`

                text +=
                    `${typeEmoji} *${o.coin}*\n` +
                    ` 🎯 Target : ${o.targetPrice.toLocaleString()}\n` +
                    ` ${locked}\n` +
                    ` 🕐 Created : ${date}\n` +
                    ` 🆔 ID : ${o.id}\n\n`
            }

            text += `Use ${prefix}cancel-order <ID> to cancel an order.`

            await socket.sendMessage(msg.remoteJid, { text }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand