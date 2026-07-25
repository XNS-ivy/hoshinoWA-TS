import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'sell',
    access: 'regular' as const,
    usage: [`sell <ID> <CoinAmount>`, `sell BTC 0.005`],
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')
        const [coinId, rawAmount] = args

        if (!coinId || !rawAmount) {
            return socket.sendMessage(msg.remoteJid, {
                text:
                    `❌ Incorrect format.\n` +
                    `Usage: ${prefix}sell <ID> <CoinAmount>\n` +
                    `Example: ${prefix}sell BTC 0.005`
            }, { quoted: msg.raw })
        }

        const amountCoin = Number(rawAmount)
        if (isNaN(amountCoin) || amountCoin <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Invalid coin amount.`
            }, { quoted: msg.raw })
        }

        try {
            const result = await cryptoTrade.marketSell(msg.lid, coinId, amountCoin)
            await socket.sendMessage(msg.remoteJid, {
                text:
                    `✅ *Market Sell Successful!*\n\n` +
                    `🪙 Coin          : ${coinId.toUpperCase()}\n` +
                    `💰 Price         : ${result.price.toLocaleString()}\n` +
                    `📦 Coin Sold     : ${result.amountCoin.toLocaleString(undefined, { maximumFractionDigits: 8 })}\n` +
                    `💵 Cash Received : ${result.amountCash.toLocaleString()}\n` +
                    `💸 Fee           : ${result.fee.toLocaleString()}\n` +
                    `🏦 Balance       : ${result.newBalance.toLocaleString()}\n` +
                    `📊 Coin Left     : ${result.newCoinBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })}`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand