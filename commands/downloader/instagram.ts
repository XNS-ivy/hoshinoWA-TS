import { igdl } from 'btch-downloader'
import { Buffer } from "node:buffer"

export default {
    name: 'igdownload',
    category: 'downloader',
    usage: 'igdownload <links>',
    async execute(args, { msg, socket }) {
        if (!args[0]) {
            return socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Please provide the Instagram link.' },
                { quoted: msg.raw }
            )
        }

        try {
            socket.sendMessage(
                msg.remoteJid,
                { text: '🔄 Downloading process is underway, please wait a moment.' },
                { quoted: msg.raw }
            )

            const data = await igdl(args[0])

            if (!data?.result || data.result.length === 0) {
                throw new Error('No media found')
            }

            for (const item of data.result) {
                if (!item?.url) continue

                const res = await fetch(item.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    redirect: 'follow'
                })

                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

                const arrayBuffer = await res.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)

                // Deteksi dari URL karena content-type-nya octet-stream
                const isVideo = item.url.includes('.mp4') || item.thumbnail !== undefined

                await socket.sendMessage(
                    msg.remoteJid,
                    isVideo
                        ? {
                            video: buffer,
                            mimetype: 'video/mp4',
                            fileName: 'igdownload.mp4'
                        }
                        : {
                            image: buffer,
                        },
                    { quoted: msg.raw }
                )
            }

        } catch (err) {
            logger.log(err as string, 'ERROR', 'igdownload')
            socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Failed to download media.' },
                { quoted: msg.raw }
            )
        }
    },
} as ICommand