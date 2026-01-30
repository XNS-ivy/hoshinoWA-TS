import axios from 'axios'
import path from 'path'
import fs from 'fs'
import { gifToMP4 } from '@utils/ffmpeg'
import { safeUnlink } from '@utils/fs'
import { isPlaceholder } from '@local_modules/any/image-placeholder-check'
import { downloadGifPipeline } from '@local_modules/pipes/gifdownload'

export default {
    name: 'waifunsfw',
    access: 'regular',
    args: [
        'waifu', 'neko', 'trap', 'blowjob'
    ],
    usage: 'waifupict <type>',
    async execute(args, { msg, socket }) {
        const available = Array.isArray(this.args) ? this.args : []
        const input = args?.[0]?.toLowerCase()
        const category = (typeof input === 'string' && available.includes(input)) ? input : 'waifu'
        if (input && !available.includes(input)) {
            const listText = available.map(a => `• ${a}`).join('\n')
            const text = `❌ Invalid category: *${input}*\n\n✅ Available types:\n${listText}`
            socket.sendMessage(msg.remoteJid, { text: text }, { ephemeralExpiration: msg.expiration, quoted: msg.raw })
        } else {
            let gifPath: string | undefined
            let mp4Path: string | undefined
            try {
                const { data } = await axios.get(`https://api.waifu.pics/nsfw/${category}`)
                const url: string = data.url

                const tmpDir = './media/temp'
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

                const base = `${Date.now()}-${Math.random().toString(36).slice(2)}`
                gifPath = path.join(tmpDir, `${base}.gif`)
                mp4Path = path.join(tmpDir, `${base}.mp4`)

                if (url.endsWith('.gif')) {
                    await downloadGifPipeline(url, gifPath)
                    if (await isPlaceholder(gifPath)) {
                        throw new Error('Placeholder image detected')
                    }
                    await gifToMP4(gifPath, mp4Path)

                    const buffer = await fs.promises.readFile(mp4Path)
                    await socket.sendMessage(
                        msg.remoteJid,
                        {
                            video: buffer,
                            gifPlayback: true,
                            caption: `✨ Random *${category}*`
                        },
                        { quoted: msg.raw }
                    )
                    return
                }

                await socket.sendMessage(
                    msg.remoteJid,
                    { image: { url }, caption: `✨ Random *${category}*` },
                    { quoted: msg.raw }
                )
            } catch (error) {
                logger.log(
                    `WaifuPics Error: ${error instanceof Error ? error.message : String(error)}`,
                    'ERROR',
                    'waifunsfw'
                )
                await socket.sendMessage(
                    msg.remoteJid,
                    { text: '❌ Failed to fetch anime image. Try again later.' },
                    { quoted: msg.raw }
                )
            } finally {
                if (gifPath) await safeUnlink(gifPath)
                if (mp4Path) await safeUnlink(mp4Path)
                fs.rmSync('./media/temp/', { recursive: true, force: true })
                fs.mkdirSync('./media/temp/', { recursive: true })
            }

        }
    }
} as ICommand