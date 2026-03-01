import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { convertLID } from '@local_modules/whatsapp/msg-processing'
import { config } from '@core/bot-config'

export default {
    name: 'trade-register',
    access: 'regular' as const,
    usage: 'trade-register',
    category: 'trade',

    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')
        const existing = await cryptoTrade.getWallet(msg.lid)
        if (existing) {
            const config = await cryptoTrade.getConfig()
            return socket.sendMessage(msg.remoteJid, {
                text:
                    `⚠️ You're registered!\n\n` +
                    `💰 Balance: ${existing.balance.toLocaleString()}\n` +
                    `📅 Register: ${new Date(existing.registeredAt).toLocaleString('id-ID')}\n\n` +
                    `Use ${prefix}portfolio to view your asset details.`
            }, { quoted: msg.raw })
        }

        const phoneJid = msg.isOnGroup
            ? (msg.raw.key.participant ?? msg.remoteJid)
            : msg.remoteJid

        try {
            const wallet = await cryptoTrade.getOrCreateWallet(msg.lid, phoneJid)
            const config = await cryptoTrade.getConfig()

            await socket.sendMessage(msg.remoteJid, {
                text:
                    `✅ *Registration Successful!*\n\n` +
                    `👤 Name: ${msg.pushName ?? '-'}\n` +
                    `💰 Balance: ${wallet.balance.toLocaleString()}\n\n` +
                    `Welcome to CryptoTrade! 🎉\n` +
                    `Use ${prefix}price <coin> to check the price,\n` +
                    `and ${prefix}buy <coin> <amount> to start trading.`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ Registration failed: ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand