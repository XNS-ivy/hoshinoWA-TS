import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'trade-ipo-result',
    access: 'owner' as const,
    usage: ['trade-ipo-result <ID>', 'trade-ipo-result BTC'],
    category: 'owner',

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        const prefix = await config.getConfig('prefix')
        if (!whoAMI.ownerRole) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ You are not the owner.'
            }, { quoted: msg.raw })
        }

        const [coinId] = args
        if (!coinId) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Incorrect format.\nUsage: ${prefix}trade-ipo-result <ID>\nExample: ${prefix}trade-ipo-result BTC`
            }, { quoted: msg.raw })
        }

        const ipos = await cryptoTrade.getIpos()
        const ipo = ipos.find(i => i.coinId === coinId.toUpperCase() && i.status === 'open')
        if (!ipo) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ There is no IPO open for ${coinId.toUpperCase()}.`
            }, { quoted: msg.raw })
        }

        const totalSubscribed = ipo.subscriptions.reduce((s, x) => s + x.amountCash, 0)
        const totalCoinNeeded = totalSubscribed / ipo.ipoPrice
        const isOversubscribed = totalCoinNeeded > ipo.totalSlot

        try {
            const result = await cryptoTrade.executeIpo(coinId)

            await socket.sendMessage(msg.remoteJid, {
                text:
                    `✅ *IPO ${coinId.toUpperCase()} Completed!*\n\n` +
                    `👥 Total Subscribers: ${ipo.subscriptions.length}\n` +
                    `💵 Total Funds: ${totalSubscribed.toLocaleString()}\n` +
                    `📦 Coins Distributed: ${Math.min(totalCoinNeeded, ipo.totalSlot).toLocaleString()}\n` +
                    `✅ Successfully Allocated: ${result.success} people\n` +
                    (isOversubscribed
                        ? `⚠️ Oversubscribed! Proportional allocation, ${result.refunded} people get refunded for the remaining funds.\n`
                        : ``) +
                    `\n💰 Listing Price: ${ipo.ipoPrice.toLocaleString()}`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ Gagal: ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand