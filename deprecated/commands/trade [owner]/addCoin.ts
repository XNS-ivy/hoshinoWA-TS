import { cryptoTrade } from '@core/minigames/cryptoTrade'
import { config } from '@core/bot-config'

export default {
    name: 'trade-add-coin',
    access: 'owner' as const,
    usage: ['trade-add-coin <ID> <Name> <Initial Price> <Supply>', 'trade-add-coin BTC Bitcoin 750000000 21000000'],
    category: 'owner',

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        const prefix = await config.getConfig('prefix')
        if (!whoAMI.ownerRole) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ You are not the owner.'
            }, { quoted: msg.raw })
        }

        const [id, name, rawPrice, rawSupply] = args
        if (!id || !name || !rawPrice || !rawSupply) {
            return socket.sendMessage(msg.remoteJid, {
                text: `❌ Incorrect format.\nUsage: ${prefix}trade-add-coin <ID> <Name> <Initial Price> <Supply>\nExample: ${prefix}trade-add-coin BTC Bitcoin 750000000 21000000`
            }, { quoted: msg.raw })
        }

        const initialPrice = Number(rawPrice)
        const supply = Number(rawSupply)

        if (isNaN(initialPrice) || initialPrice <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ Initial price is invalid.'
            }, { quoted: msg.raw })
        }

        if (isNaN(supply) || supply <= 0) {
            return socket.sendMessage(msg.remoteJid, {
                text: '❌ Invalid supply.'
            }, { quoted: msg.raw })
        }

        try {
            await cryptoTrade.addCoin(id, name, initialPrice, supply)
            await socket.sendMessage(msg.remoteJid, {
                text:
                    `✅ *Coins added successfully!*\n\n` +
                    `🪙 ID : ${id.toUpperCase()}\n` +
                    `📛 Name : ${name}\n` +
                    `💰 Price : ${initialPrice.toLocaleString()}\n` +
                    `📦 Supply : ${supply.toLocaleString()}`
            }, { quoted: msg.raw })
        } catch (err: any) {
            await socket.sendMessage(msg.remoteJid, {
                text: `❌ Fail: ${err?.message}`
            }, { quoted: msg.raw })
        }
    }
} as ICommand