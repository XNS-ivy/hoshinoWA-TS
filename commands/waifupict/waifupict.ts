import axios from 'axios'
import path from 'path'
import fs from 'fs'
import { gifToMP4 } from '@utils/ffmpeg'
import { downloadFile } from '@utils/axios'
import { safeUnlink } from '@utils/fs'

export default {
    name: 'waifupict',
    access: 'regular',
    args: [
        'waifu', 'neko', 'shinobu', 'megumin', 'bully', 'cry', 'cuddle', 'lick',
        'pat', 'smug', 'blush', 'bonk', 'yeet', 'smile', 'wave', 'highfive',
        'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'kick', 'happy',
        'wink', 'poke', 'dance', 'cringe'
    ],
    usage: 'waifupict <type>',
    async execute(args, { msg, socket }) {
        const available = Array.isArray(this.args) ? this.args : []
        const input = args?.[0]?.toLowerCase()
        let category
        if (!input) category = 'waifu'
        else { category = available.includes(input) ? input : 'waifu' }
        if (input && !available.includes(input)) {
            const listText = available.map(a => `• ${a}`).join('\n')
            const text = `❌ Invalid category: *${input}*\n\n✅ Available types:\n${listText}`
            socket.sendMessage(msg.remoteJid, { text: text }, { ephemeralExpiration: msg.expiration, quoted: msg.raw })
        } else {
            let gifPath: string | undefined
            let mp4Path: string | undefined

            try {
                const res = await axios.get(`https://api.waifu.pics/sfw/${category}`)
                const url: string = res.data.url

                const tmpDir = './media/temp'
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

                const base = `${Date.now()}-${Math.random().toString(36).slice(2)}`
                gifPath = path.join(tmpDir, `${base}.gif`)
                mp4Path = path.join(tmpDir, `${base}.mp4`)

                await downloadFile(url, gifPath)
                if (url.endsWith('.gif')) {
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
                const errMsg = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
                logger.log(`WaifuPics Error: ${errMsg}`, 'ERROR', 'waifupict')
                socket.sendMessage(msg.remoteJid, { text: '❌ Failed to fetch anime image. Try again later.' }, { ephemeralExpiration: msg.expiration, quoted: msg.raw })
            } finally {
                if (gifPath) await safeUnlink(gifPath)
                if (mp4Path) await safeUnlink(mp4Path)
            }
        }
    }
} as ICommand