import { youtube } from "btch-downloader"
import { Buffer } from "node:buffer"

export default {
    name: 'ytmp3',
    category: 'downloader',
    usage: 'ytmp3 <links>',
    async execute(args, { msg, socket }) {

        if (!args[0]) {
            return socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Please provide the YouTube link.' },
                { quoted: msg.raw }
            )
        }

        try {
            socket.sendMessage(msg.remoteJid, { text: '🔄 Downloading process is underway, please wait a moment.' }, { quoted: msg.raw })
            const data = await youtube(args[0])

            if (!data?.mp3) {
                throw new Error('MP3 unavailable')
            }

            const res = await fetch(data.mp3)

            if (!res.ok) {
                throw new Error(`Fetch failed: ${res.status}`)
            }

            const arrayBuffer = await res.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            await socket.sendMessage(
                msg.remoteJid,
                {
                    audio: buffer,
                    mimetype: 'audio/mpeg',
                    fileName: 'ytmp3.mp3'
                },
                { quoted: msg.raw }
            )

        } catch (err) {
            logger.log(err as string, 'ERROR', 'ytmp3')
            socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Failed to download audio.' },
                { quoted: msg.raw }
            )
        }
    },
} as ICommand