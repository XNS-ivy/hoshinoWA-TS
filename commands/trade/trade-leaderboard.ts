import { cryptoTrade } from '@core/minigames/cryptoTrade'

export default {
    name: 'trade-leaderboard',
    access: 'regular' as const,
    usage: 'trade-leaderboard',
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        try {
            const board = await cryptoTrade.getLeaderboard(10)

            if (board.length === 0) {
                return socket.sendMessage(msg.remoteJid, {
                    text: `📋 There are no registered players yet.`
                }, { quoted: msg.raw })
            }

            const medals = ['🥇', '🥈', '🥉']
            let text = `🏆 *CryptoTrade Leaderboard*\n\n`

            for (const entry of board) {
                const medal = medals[entry.rank - 1] ?? `${entry.rank}.`
                const plSign = entry.profitLoss >= 0 ? '+' : ''
                const plEmoji = entry.profitLoss > 0 ? '📈' : entry.profitLoss < 0 ? '📉' : '➡️'
                const display = entry.phoneJid.replace('@s.whatsapp.net', '')

                text +=
                    `${medal} *${display}*\n` +
                    `   🏦 Total Assets : ${entry.totalAssets.toLocaleString()}\n` +
                    `   ${plEmoji} P/L       : ${plSign}${entry.profitLoss.toLocaleString()} (${plSign}${entry.profitLossPercent.toFixed(2)}%)\n\n`
            }

            await socket.sendMessage(msg.remoteJid, { text }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand