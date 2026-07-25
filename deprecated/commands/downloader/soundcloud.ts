import { soundcloud } from 'btch-downloader'
import { Buffer } from "node:buffer"

export default {
    name: 'soundcloud',
    category: 'downloader',
    usage: 'soundcloud <links>',
    async execute(args, { msg, socket }) {
        if (!args[0]) {
            return socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Please provide the SoundCloud link.' },
                { quoted: msg.raw }
            )
        }

        try {
            socket.sendMessage(
                msg.remoteJid,
                { text: '🔄 Downloading process is underway, please wait a moment.' },
                { quoted: msg.raw }
            )

            const resolvedUrl = await resolveUrl(args[0])
            const data = await soundcloud(resolvedUrl)

            if (!data?.result?.audio) {
                throw new Error('Audio unavailable')
            }

            const res = await fetch(data.result.audio)

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
                    fileName: `${data.result.title ?? 'soundcloud'}.mp3`
                },
                { quoted: msg.raw }
            )

        } catch (err) {
            logger.log(err as string, 'ERROR', 'soundcloud')
            socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Failed to download audio.' },
                { quoted: msg.raw }
            )
        }
    },
} as ICommand

async function resolveUrl(url: string): Promise<string> {
    if (!url.includes('on.soundcloud.com')) return url
    const res = await fetch(url, { redirect: 'follow' })
    return res.url
}