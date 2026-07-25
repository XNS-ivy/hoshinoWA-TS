import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'trade-inject',
    access: 'owner' as const,
    usage: ['trade-inject <ID> <Amount>', 'trade-inject BTC 1000'],
    category: 'owner',

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        const prefix = await config.getConfig('prefix')
        if (!whoAMI.ownerRole) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ You are not the owner.'
            }, { quoted: msg.raw })
        }

        const [coinId, rawAmount] = args
        if (!coinId || !rawAmount) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Incorrect format.\nUsage: ${prefix}trade-inject <ID> <Amount>\nExample: ${prefix}trade-inject BTC 1000`
            }, { quoted: msg.raw })
        }

        const amount = Number(rawAmount)
        if (isNaN(amount) || amount <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ Invalid amount.'
            }, { quoted: msg.raw })
        }

        try {
            const coin = await cryptoTrade.injectSupply(coinId, amount)
            await socket.sendMessage(msg.remoteJid, {
                text:
                    `💉 *Inject Supply Successful!*\n\n` +
                    `🪙 Coin : ${coin.name} (${coin.id})\n` +
                    `📦 Injected : ${amount.toLocaleString()}\n` +
                    `📊 Circulating Supply: ${coin.circulatingSupply.toLocaleString()}\n` +
                    `💰 New Price : ${coin.price.toLocaleString()}\n\n` +
                    `⚠️ Supply goes up → price goes down`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ Fail: ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand