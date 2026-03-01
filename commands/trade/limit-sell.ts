import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'limit-sell',
    access: 'regular' as const,
    usage: [`limit-sell <ID> <CoinAmount> <TargetPrice>`, `limit-sell BTC 0.005 800000000`],
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')
        const [coinId, rawAmount, rawTarget] = args

        if (!coinId || !rawAmount || !rawTarget) {
            return socket.sendMessage(msg.remoteJid, {
                text:
                    `❌ Incorrect format.\n` +
                    `Usage: ${prefix}limit-sell <ID> <CoinAmount> <TargetPrice>\n` +
                    `Example: ${prefix}limit-sell BTC 0.005 800000000\n\n` +
                    `Coins will be locked until the order is executed or cancelled.`
            }, { quoted: msg.raw })
        }

        const amountCoin = Number(rawAmount)
        const targetPrice = Number(rawTarget)

        if (isNaN(amountCoin) || amountCoin <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Invalid coin amount.`
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

            if (targetPrice <= coin.price) {
                return socket.sendMessage(msg.remoteJid, {
                    text:
                        `❌ Limit sell target must be *above* current price.\n` +
                        `Current price: ${coin.price.toLocaleString()}\n` +
                        `Your target  : ${targetPrice.toLocaleString()}`
                }, { quoted: msg.raw })
            }

            const order = await cryptoTrade.limitSell(msg.lid, coinId, amountCoin, targetPrice)
            await socket.sendMessage(msg.remoteJid, {
                text:
                    `✅ *Limit Sell Order Placed!*\n\n` +
                    `🪙 Coin         : ${order.coin}\n` +
                    `🎯 Target Price : ${order.targetPrice.toLocaleString()}\n` +
                    `📦 Coins Locked : ${order.amountCoin.toLocaleString(undefined, { maximumFractionDigits: 8 })}\n` +
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