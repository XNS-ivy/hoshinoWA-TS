import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'trade-subscribe',
    access: 'regular' as const,
    usage: ['trade-subscribe <ID> <Amount>', 'trade-subscribe BTC 500000'],
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')
        if (args.length === 0) {
            const ipos = await cryptoTrade.getIpos()
            const openIpos = ipos.filter(i => i.status === 'open')

            if (openIpos.length === 0) {
                return socket.sendMessage(msg.remoteJid, {
                    text: `📋 There are no IPOs currently open.`
                }, { quoted: msg.raw })
            }

            let text = `📋 *IPO Available*\n\n`
            for (const ipo of openIpos) {
                const deadlineDate = new Date(ipo.deadline).toLocaleString('id-ID')
                const totalSubscribed = ipo.subscriptions.reduce((s, x) => s + x.amountCash, 0)
                const alreadySubscribed = ipo.subscriptions.some(s => s.lid === msg.lid)

                text +=
                    `🪙 *${ipo.coinId}*\n` +
                    ` 💰 IPO Price : ${ipo.ipoPrice.toLocaleString()}\n` +
                    ` 📦 Total Slots : ${ipo.totalSlot.toLocaleString()}\n` +
                    ` 👥 Subscriber : ${ipo.subscriptions.length}\n` +
                    ` 💵 Total Funds : ${totalSubscribed.toLocaleString()}\n` +
                    ` ⏰ Deadline : ${deadlineDate}\n` +
                    ` ${alreadySubscribed ? '✅ Already subscribed' : '⚪ Not yet subscribed'}\n\n`
            }

            text += `Use ${prefix}trade-subscribe <ID> <Amount> to subscribe.`
            return socket.sendMessage(msg.remoteJid, { text }, { quoted: msg.raw })
        }

        const [coinId, rawAmount] = args
        if (!coinId || !rawAmount) {
            return socket.sendMessage(msg.remoteJid, {
                text:
                    `❌ Incorrect format.\n` +
                    `Usage: ${prefix}trade-subscribe <ID> <Amount>\n` +
                    `Example: ${prefix}trade-subscribe BTC 500000`
            }, { quoted: msg.raw })
        }

        const amountCash = Number(rawAmount)
        if (isNaN(amountCash) || amountCash <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Invalid amount.`
            }, { quoted: msg.raw })
        }

        try {
            await cryptoTrade.subscribeIpo(msg.lid, coinId, amountCash)

            const ipos = await cryptoTrade.getIpos()
            const ipo = ipos.find(i => i.coinId === coinId.toUpperCase())
            const wallet = await cryptoTrade.getWallet(msg.lid)

            await socket.sendMessage(msg.remoteJid, {
                text:
                    `✅ *Subscribe to IPO Successful!*\n\n` +
                    `🪙 Coins: ${coinId.toUpperCase()}\n` +
                    `💵 Locked Funds: ${amountCash.toLocaleString()}\n` +
                    `💰 Remaining Balance: ${wallet?.balance.toLocaleString() ?? '-'}\n` +
                    `⏰ Deadline: ${ipo ? new Date(ipo.deadline).toLocaleString('id-ID') : '-'}\n\n` +
                    `Funds will be returned if the IPO is oversubscribed (proportionally).`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand