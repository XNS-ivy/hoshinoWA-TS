import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'limit-buy',
    access: 'regular' as const,
    usage: [`limit-buy <ID> <Amount> <TargetPrice>`, `limit-buy BTC 50000 700000000`],
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')
        const [coinId, rawAmount, rawTarget] = args

        if (!coinId || !rawAmount || !rawTarget) {
            return socket.sendMessage(msg.remoteJid, {
                text:
                    `❌ Incorrect format.\n` +
                    `Usage: ${prefix}limit-buy <ID> <Amount> <TargetPrice>\n` +
                    `Example: ${prefix}limit-buy BTC 50000 700000000\n\n` +
                    `Funds will be locked until the order is executed or cancelled.`
            }, { quoted: msg.raw })
        }

        const amountCash = Number(rawAmount)
        const targetPrice = Number(rawTarget)

        if (isNaN(amountCash) || amountCash <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Invalid amount.`
            }, { quoted: msg.raw })
        }
        if (isNaN(targetPrice) || targetPrice <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Invalid target price.`
            }, { quoted: msg.raw })
        }

        try {
            const coin = await cryptoTrade.getCoin(coinId)
            if (!coin) throw new Error(`Coin ${coinId.toUpperCase()} not found.`)

            if (targetPrice >= coin.price) {
                return socket.sendMessage(msg.remoteJid, {
                    text:
                        `❌ Limit buy target must be *below* current price.\n` +
                        `Current price: ${coin.price.toLocaleString()}\n` +
                        `Your target  : ${targetPrice.toLocaleString()}`
                }, { quoted: msg.raw })
            }

            const order = await cryptoTrade.limitBuy(msg.lid, coinId, amountCash, targetPrice)
            await socket.sendMessage(msg.remoteJid, {
                text:
                    `✅ *Limit Buy Order Placed!*\n\n` +
                    `🪙 Coin         : ${order.coin}\n` +
                    `🎯 Target Price : ${order.targetPrice.toLocaleString()}\n` +
                    `💵 Funds Locked : ${order.amountCash.toLocaleString()}\n` +
                    `💰 Current Price: ${coin.price.toLocaleString()}\n` +
                    `🆔 Order ID     : ${order.id.slice(0, 8)}\n\n` +
                    `Order will execute automatically when price hits target.\n` +
                    `Use ${prefix}cancel-order ${order.id.slice(0, 8)} to cancel.`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand