import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'trade-ipo',
    access: 'owner' as const,
    usage: ['trade-ipo <ID> <HargaIPO> <TotalSlot> <DurasiJam>', 'trade-ipo BTC 500000000 1000 24'],
    category: 'owner',

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        const prefix = await config.getConfig('prefix')
        if (!whoAMI.ownerRole) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ You are not the owner.'
            }, { quoted: msg.raw })
        }

        if (args.length === 0) {
            const ipos = await cryptoTrade.getIpos()
            const openIpos = ipos.filter(i => i.status === 'open')

            if (openIpos.length === 0) {
                return socket.sendMessage(msg.remoteJid, {
                    text: '📋 There are no IPOs currently open.'
                }, { quoted: msg.raw })
            }

            let text = `📋 *IPO in Progress*\n\n`
            for (const ipo of openIpos) {
                const deadlineDate = new Date(ipo.deadline)
                const totalSubscribed = ipo.subscriptions.reduce((s, x) => s + x.amountCash, 0)
                text +=
                    `🪙 *${ipo.coinId}*\n` +
                    `💰 IPO Price : ${ipo.ipoPrice.toLocaleString()}\n` +
                    `📦 Total Slots : ${ipo.totalSlot.toLocaleString()}\n` +
                    `👥 Subscriber : ${ipo.subscriptions.length}\n` +
                    `💵 Total Subscribe: ${totalSubscribed.toLocaleString()}\n` +
                    `⏰ Deadline : ${deadlineDate.toLocaleString('id-ID')}\n\n`
            }

            return socket.sendMessage(msg.remoteJid, { text }, { quoted: msg.raw })
        }

        const [coinId, rawPrice, rawSlot, rawDuration] = args
        if (!coinId || !rawPrice || !rawSlot || !rawDuration) {
            return socket.sendMessage(msg.remoteJid, {
                text:
                    `❌ Incorrect format.\n` +
                    `Usage: ${prefix}trade-ipo <ID> <IPOPrice> <TotalSlots> <Hours Duration>\n` +
                    `Example: ${prefix}trade-ipo BTC 500000000 1000 24`
            }, { quoted: msg.raw })
        }

        const ipoPrice = Number(rawPrice)
        const totalSlot = Number(rawSlot)
        const durationHour = Number(rawDuration)

        if (isNaN(ipoPrice) || ipoPrice <= 0) {
            return socket.sendMessage(msg.remoteJid, { text: '❌ IPO price is invalid.' }, { quoted: msg.raw })
        }
        if (isNaN(totalSlot) || totalSlot <= 0) {
            return socket.sendMessage(msg.remoteJid, { text: '❌ Total slots are invalid.' }, { quoted: msg.raw })
        }
        if (isNaN(durationHour) || durationHour <= 0) {
            return socket.sendMessage(msg.remoteJid, { text: '❌ Invalid duration.' }, { quoted: msg.raw })
        }

        try {
            const durationMs = durationHour * 60 * 60 * 1000
            const ipo = await cryptoTrade.createIpo(coinId, ipoPrice, totalSlot, durationMs)
            const deadlineDate = new Date(ipo.deadline)

            await socket.sendMessage(msg.remoteJid, {
                text:
                    `🎉 *IPO Successfully Created!*\n\n` +
                    `🪙 Coins: ${ipo.coinId}\n` +
                    `💰 IPO Price: ${ipo.ipoPrice.toLocaleString()}\n` +
                    `📦 Total Slots: ${ipo.totalSlot.toLocaleString()}\n` +
                    `⏰ Deadline: ${deadlineDate.toLocaleString('id-ID')}\n\n` +
                    `Users can subscribe with: trade-subscribe ${ipo.coinId} <amount>`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ Fail: ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand