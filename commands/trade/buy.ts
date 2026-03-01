import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'buy',
    access: 'regular' as const,
    usage: [`buy <ID> <Amount>`, `buy BTC 50000`],
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')
        const [coinId, rawAmount] = args

        if (!coinId || !rawAmount) {
            return socket.sendMessage(msg.remoteJid, {
                text:
                    `❌ Incorrect format.\n` +
                    `Usage: ${prefix}buy <ID> <Amount>\n` +
                    `Example: ${prefix}buy BTC 50000`
            }, { quoted: msg.raw })
        }

        const amountCash = Number(rawAmount)
        if (isNaN(amountCash) || amountCash <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Invalid amount.`
            }, { quoted: msg.raw })
        }

        try {
            const result = await cryptoTrade.marketBuy(msg.lid, coinId, amountCash)
            await socket.sendMessage(msg.remoteJid, {
                text:
                    `✅ *Market Buy Successful!*\n\n` +
                    `🪙 Coin          : ${coinId.toUpperCase()}\n` +
                    `💰 Price         : ${result.price.toLocaleString()}\n` +
                    `📦 Coin Received : ${result.amountCoin.toLocaleString(undefined, { maximumFractionDigits: 8 })}\n` +
                    `💵 Cash Spent    : ${result.amountCash.toLocaleString()}\n` +
                    `💸 Fee           : ${result.fee.toLocaleString()}\n` +
                    `🏦 Balance Left  : ${result.newBalance.toLocaleString()}\n` +
                    `📊 Coin Balance  : ${result.newCoinBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })}`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand