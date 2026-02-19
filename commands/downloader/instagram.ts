import { ttdl } from 'btch-downloader'
import { Buffer } from "node:buffer"

export default {
    name: 'tiktok',
    category: 'downloader',
    usage: 'tiktok <links>',
    async execute(args, { msg, socket }) {
        if (!args[0]) {
            return socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Please provide the TikTok link.' },
                { quoted: msg.raw }
            )
        }

        try {
            socket.sendMessage(
                msg.remoteJid,
                { text: '🔄 Downloading process is underway, please wait a moment.' },
                { quoted: msg.raw }
            )

            const data = await ttdl(args[0])

            if (!data?.status) throw new Error('Failed to fetch TikTok data')

            const videoUrl = data.video?.[0]
            const audioUrl = data.audio?.[0]
            const mediaUrl = videoUrl ?? audioUrl

            if (!mediaUrl) throw new Error('No media URL found')

            const res = await fetch(mediaUrl)
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

            const buffer = Buffer.from(await res.arrayBuffer())
            const isVideo = !!videoUrl

            await socket.sendMessage(
                msg.remoteJid,
                isVideo
                    ? {
                        video: buffer,
                        mimetype: 'video/mp4',
                        fileName: `${data.title ?? 'tiktok'}.mp4`,
                        caption: data.title ?? ''
                    }
                    : {
                        audio: buffer,
                        mimetype: 'audio/mpeg',
                        fileName: `${data.title_audio ?? 'tiktok_audio'}.mp3`
                    },
                { quoted: msg.raw }
            )

        } catch (err) {
            logger.log(err as string, 'ERROR', 'tiktok')
            socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Failed to download video.' },
                { quoted: msg.raw }
            )
        }
    },
} as ICommand