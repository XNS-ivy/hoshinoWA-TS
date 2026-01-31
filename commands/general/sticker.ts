import { downloadMediaMessage } from 'baileys'
import { makeSticker } from '@utils/sharp'
import { makeAnimatedSticker } from '@utils/ffmpeg'

export default {
    name: 'sticker',
    args: ['crop'],
    usage: ['sticker', 'sticker crop'],
    async execute(args, { msg, socket }) {

        let targetMsg: any = null
        let isAnimated = false

        if (msg.type === 'imageMessage') {
            targetMsg = msg.raw
        }
        else if (msg.type === 'videoMessage') {
            targetMsg = msg.raw
            isAnimated = true
        }
        else if (msg.quoted?.type === 'imageMessage') {
            targetMsg = { key: msg.raw.key, message: msg.rawQuoted }
        }
        else if (msg.quoted?.type === 'videoMessage') {
            targetMsg = { key: msg.raw.key, message: msg.rawQuoted }
            isAnimated = true
        }

        if (!targetMsg) return

        const buffer = await downloadMediaMessage(
            targetMsg,
            'buffer',
            {},
            { logger: { level: 'silent' } as any, reuploadRequest: socket.updateMediaMessage }
        )

        const sticker = isAnimated
            ? await makeAnimatedSticker(buffer, {
                crop: args[0] === 'crop'
            })
            : await makeSticker(buffer, {
                crop: args[0] === 'crop'
            })

        await socket.sendMessage(msg.remoteJid, { sticker })
    }
} as ICommand