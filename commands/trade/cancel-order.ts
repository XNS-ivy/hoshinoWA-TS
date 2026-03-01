import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'cancel-order',
    access: 'regular' as const,
    usage: [`cancel-order <OrderID>`, `cancel-order a1b2c3d4`],
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')
        const [orderId] = args

        if (!orderId) {
            const orders = await cryptoTrade.getPendingOrders(msg.lid)
            if (orders.length === 0) {
                return socket.sendMessage(msg.remoteJid, {
                    text: `📋 You have no pending orders.`
                }, { quoted: msg.raw })
            }

            let text = `📋 *Your Pending Orders*\n\n`
            for (const o of orders) {
                const typeEmoji = o.type === 'buy' ? '🟢 LIMIT BUY' : '🔴 LIMIT SELL'
                const locked = o.type === 'buy'
                    ? `💵 Locked: ${o.amountCash.toLocaleString()}`
                    : `📦 Locked: ${o.amountCoin.toLocaleString(undefined, { maximumFractionDigits: 8 })}`
                text +=
                    `${typeEmoji} *${o.coin}*\n` +
                    `   🎯 Target : ${o.targetPrice.toLocaleString()}\n` +
                    `   ${locked}\n` +
                    `   🆔 ID     : ${o.id.slice(0, 8)}\n\n`
            }

            text += `Use ${prefix}cancel-order <ID> to cancel an order.`
            return socket.sendMessage(msg.remoteJid, { text }, { quoted: msg.raw })
        }

        try {
            const allOrders = await cryptoTrade.getPendingOrders(msg.lid)
            const match = allOrders.find(o =>
                o.id === orderId || o.id.startsWith(orderId)
            )

            if (!match) {
                return socket.sendMessage(msg.remoteJid, {
                    text: `❌ Order not found. Use ${prefix}cancel-order to see your pending orders.`
                }, { quoted: msg.raw })
            }

            const cancelled = await cryptoTrade.cancelOrder(msg.lid, match.id)
            const refundText = cancelled.type === 'buy'
                ? `💵 Refunded: ${cancelled.amountCash.toLocaleString()} (cash)`
                : `📦 Refunded: ${cancelled.amountCoin.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${cancelled.coin}`

            await socket.sendMessage(msg.remoteJid, {
                text:
                    `✅ *Order Cancelled!*\n\n` +
                    `🪙 Coin    : ${cancelled.coin}\n` +
                    `🎯 Target  : ${cancelled.targetPrice.toLocaleString()}\n` +
                    `${refundText}\n\n` +
                    `Locked funds/coins have been returned to your wallet.`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand