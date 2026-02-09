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
        else if (msg.type === 'documentMessage') {
            const parsed = parseDocumentType(msg.raw.message?.documentMessage)
            if (!parsed) return

            targetMsg = msg.raw
            isAnimated = parsed.animated
        }
        else if (msg.quoted?.type === 'imageMessage') {
            targetMsg = { key: msg.raw.key, message: msg.rawQuoted }
        }
        else if (msg.quoted?.type === 'videoMessage') {
            targetMsg = { key: msg.raw.key, message: msg.rawQuoted }
            isAnimated = true
        }
        else if (msg.quoted?.type === 'documentMessage') {
            if (!msg.rawQuoted) return
            const parsed = parseDocumentType(msg.rawQuoted.documentMessage)
            if (!parsed) return

            targetMsg = { key: msg.raw.key, message: msg.rawQuoted }
            isAnimated = parsed.animated
        }

        if (!targetMsg) return

        const buffer = await downloadMediaMessage(
            targetMsg,
            'buffer',
            {},
            { logger: { level: 'silent' } as any, reuploadRequest: socket.updateMediaMessage }
        )

        let sticker: Buffer | null = null

        if (isAnimated) {
            try {
                sticker = await makeAnimatedSticker(buffer, {
                    crop: args[0] === 'crop'
                })
            } catch (err: any) {
                logger.log('ffmpeg failed', 'ERROR', 'sticker command')
                try {
                    sticker = await makeSticker(buffer, {
                        crop: args[0] === 'crop'
                    })
                } catch (fallbackErr) {
                    logger.log(`Fallback failed : ${fallbackErr}`, 'ERROR', 'sticker command')
                }
            }
        } else {
            sticker = await makeSticker(buffer, {
                crop: args[0] === 'crop'
            })
        }

        if (!sticker) {
            return socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Failed to create sticker (ffmpeg / image error)' },
                { quoted: msg.raw }
            )
        }

        await socket.sendMessage(
            msg.remoteJid,
            { sticker },
            { quoted: msg.raw }
        )
    }
} as ICommand

function parseDocumentType(doc: any) {
    const mime = doc.mimetype || ''
    const name = (doc.fileName || '').toLowerCase()

    if (mime.startsWith('image/')) {
        if (mime === 'image/gif' || name.endsWith('.gif')) {
            return { type: 'gif', animated: true }
        }
        return { type: 'image', animated: false }
    }

    if (mime.startsWith('video/')) {
        return { type: 'video', animated: true }
    }

    return null
}
