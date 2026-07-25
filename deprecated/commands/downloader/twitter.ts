import { Buffer } from "node:buffer"

interface TwitterMedia {
    url: string
    type?: string
}

interface TwitterResponse {
    tweet?: {
        text?: string
        media?: {
            all?: TwitterMedia[]
            videos?: TwitterMedia[]
            photos?: TwitterMedia[]
        }
    }
}

async function twitterDl(url: string): Promise<TwitterResponse> {
    const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/)
    if (!match) throw new Error('Invalid Twitter/X URL')
    const [_, username, statusId] = match
    const res = await fetch(`https://api.fxtwitter.com/${username}/status/${statusId}`)
    return res.json() as Promise<TwitterResponse>
}

export default {
    name: 'twitter',
    category: 'downloader',
    usage: 'twitter <links>',
    async execute(args, { msg, socket }) {
        if (!args[0]) {
            return socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Please provide the Twitter/X link.' },
                { quoted: msg.raw }
            )
        }

        try {
            socket.sendMessage(
                msg.remoteJid,
                { text: '🔄 Downloading process is underway, please wait a moment.' },
                { quoted: msg.raw }
            )

            const data = await twitterDl(args[0])

            if (!data?.tweet) throw new Error('Tweet not found')

            const tweet = data.tweet
            const all = tweet?.media?.all ?? []
            const videos = tweet?.media?.videos ?? []
            const photos = tweet?.media?.photos ?? []

            if (all.length === 0) {
                return socket.sendMessage(
                    msg.remoteJid,
                    { text: '❌ No media found in this tweet.' },
                    { quoted: msg.raw }
                )
            }

            const caption = tweet.text ?? ''
            let isFirst = true

            for (const media of all) {
                const res = await fetch(media.url)
                if (!res.ok) continue

                const buffer = Buffer.from(await res.arrayBuffer())
                const isGif = media.type === 'gif'
                const isVideo = media.type === 'video' || isGif

                await socket.sendMessage(
                    msg.remoteJid,
                    isVideo
                        ? {
                            video: buffer,
                            mimetype: 'video/mp4',
                            fileName: 'twitter.mp4',
                            gifPlayback: isGif,
                            ...(isFirst && { caption })
                        }
                        : {
                            image: buffer,
                            ...(isFirst && { caption })
                        },
                    { quoted: msg.raw }
                )
                isFirst = false
            }

        } catch (err) {
            logger.log(err as string, 'ERROR', 'twitter')
            socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Failed to download media.' },
                { quoted: msg.raw }
            )
        }
    },
} as ICommand