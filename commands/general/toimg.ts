import type { IMessageFetch } from "@local_modules/whatsapp/msg-processing"
import { downloadMediaMessage, type proto, type WAMessage } from "baileys"
import sharp from 'sharp'

export default {
    name: 'toimg',
    usage: 'toimg (reply image / sticker)',
    async execute(_, { msg, socket }) {
        if (!msg.quoted) {
            return socket.sendMessage(msg.remoteJid, { text: '❌ Reply image or sticker' }, { quoted: msg.raw })
        }

        const quotedType = msg.quoted.type
        if (quotedType !== 'imageMessage' && quotedType !== 'stickerMessage') {
            return socket.sendMessage(msg.remoteJid, { text: '❌ Reply image or sticker' }, { quoted: msg.raw })
        }

        try {
            const contextInfo = msg.raw.message?.extendedTextMessage?.contextInfo
            
            if (!contextInfo || !contextInfo.quotedMessage) {
                return socket.sendMessage(msg.remoteJid, { text: '❌ Cannot get quoted message' }, { quoted: msg.raw })
            }
            let actualQuotedMsg = contextInfo.quotedMessage
            
            if (actualQuotedMsg.viewOnceMessage?.message) {
                actualQuotedMsg = actualQuotedMsg.viewOnceMessage.message
            } else if (actualQuotedMsg.viewOnceMessageV2?.message) {
                actualQuotedMsg = actualQuotedMsg.viewOnceMessageV2.message
            } else if (actualQuotedMsg.ephemeralMessage?.message) {
                actualQuotedMsg = actualQuotedMsg.ephemeralMessage.message
            }
            const quotedMsgObj: WAMessage = {
                key: {
                    remoteJid: msg.remoteJid,
                    fromMe: contextInfo.participant === socket.user?.id,
                    id: contextInfo.stanzaId || '',
                    participant: contextInfo.participant
                },
                message: actualQuotedMsg,
                messageTimestamp: msg.raw.messageTimestamp
            }
            const buffer = await downloadMediaMessage(
                quotedMsgObj,
                'buffer',
                {},
                {
                    logger: { level: 'silent' } as any,
                    reuploadRequest: socket.updateMediaMessage
                }
            )

            const output = quotedType === 'stickerMessage'
                ? await sharp(buffer).png().toBuffer()
                : buffer

            await socket.sendMessage(
                msg.remoteJid,
                { image: output, caption: '✅ Converted to image' },
                { quoted: msg.raw }
            )
        } catch (err) {
            logger.log(`Error downloading media: ${err}`, 'INFO', 'toimg')
            return socket.sendMessage(
                msg.remoteJid, 
                { text: '❌ Failed to download media. ViewOnce messages cannot be downloaded after being viewed.' }, 
                { quoted: msg.raw }
            )
        }
    }
} as ICommand