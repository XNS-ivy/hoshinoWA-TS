import { youtube } from 'btch-downloader'
import { Buffer } from "node:buffer"

export default {
    name: 'ytmp4',
    category: 'downloader',
    usage: 'ytmp4 <links>',
    async execute(args, { msg, socket }) {
        if (!args[0]) {
            return socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Please provide the YouTube link.' },
                { quoted: msg.raw }
            )
        }

        try {
            socket.sendMessage(
                msg.remoteJid,
                { text: '🔄 Downloading process is underway, please wait a moment.' },
                { quoted: msg.raw }
            )

            const data = await youtube(args[0])

            if (!data?.mp4) throw new Error('MP4 unavailable')

            const res = await fetch(data.mp4)
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

            const buffer = Buffer.from(await res.arrayBuffer())

            await socket.sendMessage(
                msg.remoteJid,
                {
                    video: buffer,
                    mimetype: 'video/mp4',
                    fileName: `${data.title ?? 'ytmp4'}.mp4`,
                    caption: data.title ?? ''
                },
                { quoted: msg.raw }
            )

        } catch (err) {
            logger.log(err as string, 'ERROR', 'ytmp4')
            socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Failed to download video.' },
                { quoted: msg.raw }
            )
        }
    },
} as ICommand