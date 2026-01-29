import axios from 'axios'
import path from 'path'
import fs from 'fs'
import { gifToMP4 } from '@utils/ffmpeg'
import { downloadFile } from '@utils/axios'

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
        let category
        if (!input) category = 'waifu'
        else { category = available.includes(input) ? input : 'waifu' }
        if (input && !available.includes(input)) {
            const listText = available.map(a => `• ${a}`).join('\n')
            const text = `❌ Invalid category: *${input}*\n\n✅ Available types:\n${listText}`
            socket.sendMessage(msg.remoteJid, { text: text }, { ephemeralExpiration: msg.expiration, quoted: msg.raw })
        } else {
            try {
                const res = await axios.get(`https://api.waifu.pics/nsfw/${category}`)
                const url: string = res.data.url

                const tmpDir = './media/temp'
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

                const base = Date.now()
                const gifPath = path.join(tmpDir, `${base}.gif`)
                const mp4Path = path.join(tmpDir, `${base}.mp4`)
                await downloadFile(url, gifPath)
                if (url.endsWith('.gif')) {
                    await gifToMP4(gifPath, mp4Path)

                    await socket.sendMessage(
                        msg.remoteJid,
                        {
                            video: fs.readFileSync(mp4Path),
                            gifPlayback: true,
                            caption: `✨ Random ${category}`
                        },
                        { quoted: msg.raw }
                    )

                    fs.unlinkSync(gifPath)
                    fs.unlinkSync(mp4Path)
                    return
                }

                await socket.sendMessage(
                    msg.remoteJid,
                    { image: { url }, caption: '✨ Random waifu' },
                    { quoted: msg.raw }
                )
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
                logger.log(`WaifuPics Error: ${errMsg}`, 'ERROR', 'waifupict')
                socket.sendMessage(msg.remoteJid, { text: '❌ Failed to fetch anime image. Try again later.' }, { ephemeralExpiration: msg.expiration, quoted: msg.raw })
            }
        }
    }
} as ICommand