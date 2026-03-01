import { cryptoTrade } from '@core/minigames/cryptoTrade'

export default {
    name: 'portofolio',
    access: 'regular' as const,
    usage: 'portofolio',
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        try {
            const p = await cryptoTrade.getPortfolio(msg.lid)

            const plSign = p.profitLoss >= 0 ? '+' : ''
            const plEmoji = p.profitLoss > 0 ? '📈' : p.profitLoss < 0 ? '📉' : '➡️'

            let holdingsText = ''
            if (p.holdings.length === 0) {
                holdingsText = `   _No assets yet_\n`
            } else {
                for (const h of p.holdings) {
                    holdingsText +=
                        ` 🪙 *${h.coin}* - ${h.name}\n` +
                        ` Amount : ${h.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}\n` +
                        ` Price : ${h.currentPrice.toLocaleString()}\n` +
                        ` Value : ${h.value.toLocaleString()}\n\n`
                }
            }

            await socket.sendMessage(msg.remoteJid, {
                text:
                    `💼 *Portfolio ${msg.pushName ?? ''}*\n\n` +
                    `💵 Cash Balance : ${p.balance.toLocaleString()}\n` +
                    `📊 Holding Value : ${p.totalHoldingsValue.toLocaleString()}\n` +
                    `🏦 Total Assets : ${p.totalAssets.toLocaleString()}\n\n` +
                    `📥 Initial Capital : ${p.totalDeposited.toLocaleString()}\n` +
                    `${plEmoji} Profit/Loss : ${plSign}${p.profitLoss.toLocaleString()} (${plSign}${p.profitLossPercent.toFixed(2)}%)\n\n` +
                    `📦 *Holdings:*\n${holdingsText}`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand