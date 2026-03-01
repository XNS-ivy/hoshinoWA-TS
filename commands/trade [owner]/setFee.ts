import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'trade-set-fee',
    access: 'master' as const,
    usage: ['trade-set-fee <persen>', 'trade-set-fee 0.5'],
    category: 'owner',

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        const prefix = await config.getConfig('prefix')
        if (!whoAMI.ownerRole || whoAMI.ownerRole !== 'master') {
            return socket.sendMessage(msg.remoteJid, {
                text: whoAMI.ownerRole === 'owner'
                    ? '❌ Only the master owner can change the fee.'
                    : '❌ You are not the owner.'
            }, { quoted: msg.raw })
        }

        const [rawFee] = args
        if (!rawFee) {
            const config = await cryptoTrade.getConfig()
            return socket.sendMessage(msg.remoteJid, {
                text:
                   `📋 *Current Fee Configuration*\n\n` +
                    `💸 Fee : ${config.feePercent}%\n` +
                    `📤 Distribution : ${config.feeDistribution === 'master' ? 'Master owner only' : 'All owners'}\n\n` +
                    `Usage: ${prefix}trade-set-fee <percent>\nExample: ${prefix}trade-set-fee 0.5`
            }, { quoted: msg.raw })
        }

        const fee = Number(rawFee)
        if (isNaN(fee) || fee < 0 || fee > 100) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ Fee must be an intermediate figure 0 - 100.'
            }, { quoted: msg.raw })
        }

        try {
            await cryptoTrade.setFee(fee)
            await socket.sendMessage(msg.remoteJid, {
                text: `✅ Fee successfully changed to *${fee}%*`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ Fail: ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand