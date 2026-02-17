import { youtube } from "btch-downloader"
import { Buffer } from 'node:buffer'
export default {
    name: 'ytmp3',
    category: 'downloader',
    async execute(args, { msg, socket }) {
        if (!args[0]) {
            socket.sendMessage(msg.remoteJid, { text: 'Please provide the YouTube link.' }, { quoted: msg.raw })
            return
        }
        try {
            const url = await youtube(args[0])
            if (!url?.mp3) {
                throw new Error('Unvailable')
            }
            const res = await fetch(url.mp3)
            const arrayBuffer = res
            const buffer = Buffer.from()
            socket.sendMessage(msg.remoteJid, { audio: })
        } catch (error) {

        }
    },
} as ICommand