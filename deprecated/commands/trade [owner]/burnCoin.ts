import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'trade-burn',
    access: 'owner' as const,
    usage: ['trade-burn <ID> <Amount>', 'trade-burn BTC 500'],
    category: 'owner',

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        const prefix = await config.getConfig('prefix')
        if (!whoAMI.ownerRole) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ Kamu bukan owner.'
            }, { quoted: msg.raw })
        }

        const [coinId, rawAmount] = args
        if (!coinId || !rawAmount) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Incorrect format.\nUsage: ${prefix}trade-burn <ID> <Amount>\nExample: ${prefix}trade-burn BTC 500`
            }, { quoted: msg.raw })
        }

        const amount = Number(rawAmount)
        if (isNaN(amount) || amount <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ Invalid amount.'
            }, { quoted: msg.raw })
        }

        try {
            const coin = await cryptoTrade.burnSupply(coinId, amount)
            await socket.sendMessage(msg.remoteJid, {
                text:
                    `🔥 *Burn Supply Successful!*\n\n` +
                    `🪙 Coin : ${coin.name} (${coin.id})\n` +
                    `🔥 Burned : ${amount.toLocaleString()}\n` +
                    `📊 Circulating Supply: ${coin.circulatingSupply.toLocaleString()}\n` +
                    `💰 New Price : ${coin.price.toLocaleString()}\n\n` +
                    `📈 Supply goes down → price goes up`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ Gagal: ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand