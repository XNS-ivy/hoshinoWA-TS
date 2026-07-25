import { cryptoTrade } from '@core/minigames/cryptoTrade'

export default {
    name: 'trade-history',
    access: 'regular' as const,
    usage: ['trade-history', 'trade-history <ID>', 'trade-history BTC'],
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const coinId = args[0] ?? undefined

        try {
            const trades = await cryptoTrade.getTradeHistory(msg.lid, coinId, 10)

            if (trades.length === 0) {
                return socket.sendMessage(msg.remoteJid, {
                    text: coinId
                        ? `📋 There is no transaction history for *${coinId.toUpperCase()}*.`
                        : `📋 There is no transaction history yet.`
                }, { quoted: msg.raw })
            }

            const title = coinId
                ? `📜 *Transaction History ${coinId.toUpperCase()}*`
                : `📜 *Transaction History (Last 10)*`

            let text = `${title}\n\n`
            for (const t of trades) {
                const typeEmoji = t.type === 'buy' ? '🟢 BUY' : '🔴 SELL'
                const date = new Date(t.timestamp).toLocaleString('id-ID')
                text +=
                    `${typeEmoji} *${t.coin}*\n` +
                    ` 💰 Price : ${t.price.toLocaleString()}\n` +
                    ` 🪙 Coin : ${t.amountCoin.toLocaleString(undefined, { maximumFractionDigits: 8 })}\n` +
                    ` 💵 Cash : ${t.amountCash.toLocaleString()}\n` +
                    ` 💸 Fee : ${t.fee.toLocaleString()}\n` +
                    ` 🕐 Time : ${date}\n\n`
            }

            await socket.sendMessage(msg.remoteJid, { text }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand