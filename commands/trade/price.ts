import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'price',
    access: 'regular' as const,
    usage: ['price <ID>', 'price BTC', 'price'],
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')
        if (!args[0]) {
            const coins = await cryptoTrade.getCoins()
            if (coins.length === 0) {
                return socket.sendMessage(msg.remoteJid, {
                    text: '📋 No coins listed yet.'
                }, { quoted: msg.raw })
            }

            let text = `📊 *Coin Price List*\n\n`
            for (const coin of coins) {
                const prev = coin.priceHistory.at(-2)?.price ?? coin.price
                const change = coin.price - prev
                const changePercent = prev > 0 ? ((change / prev) * 100).toFixed(2) : '0.00'
                const arrow = change > 0 ? '📈' : change < 0 ? '📉' : '➡️'

                text +=
                    `${arrow} *${coin.id}* - ${coin.name}\n` +
                    `   💰 ${coin.price.toLocaleString()}\n` +
                    `   ${change >= 0 ? '+' : ''}${change.toLocaleString()} (${change >= 0 ? '+' : ''}${changePercent}%)\n\n`
            }

            text += `Type ${prefix}price <ID> for details of a specific coin.`
            return socket.sendMessage(msg.remoteJid, { text }, { quoted: msg.raw })
        }

        try {
            const coin = await cryptoTrade.getPrice(args[0])
            const prev = coin.priceHistory.at(-2)?.price ?? coin.price
            const change = coin.price - prev
            const changePercent = prev > 0 ? ((change / prev) * 100).toFixed(2) : '0.00'
            const arrow = change > 0 ? '📈' : change < 0 ? '📉' : '➡️'
            const lastUpdated = new Date(coin.lastUpdated).toLocaleString('id-ID')

            const recentHistory = coin.priceHistory.slice(-5).reverse()
            let historyText = ''
            for (const h of recentHistory) {
                historyText += `  • ${h.price.toLocaleString()} — ${new Date(h.timestamp).toLocaleString('id-ID')}\n`
            }

            await socket.sendMessage(msg.remoteJid, {
                text:
                    `${arrow} *${coin.name} (${coin.id})*\n\n` +
                    `💰 Price : ${coin.price.toLocaleString()}\n` +
                    `📊 Change : ${change >= 0 ? '+' : ''}${change.toLocaleString()} (${change >= 0 ? '+' : ''}${changePercent}%)\n` +
                    `📦 Circulating : ${coin.circulatingSupply.toLocaleString()}\n` +
                    `🏦 Total Supply : ${coin.supply.toLocaleString()}\n` +
                    `🕐 Update : ${lastUpdated}\n\n` +
                    `📜 *Last Price History:*\n${historyText}`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand