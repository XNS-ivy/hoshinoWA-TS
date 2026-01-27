import axios from 'axios'

export default {
    name: 'waifupict',
    access: 'regular',
    args: [
        'waifu', 'neko', 'shinobu', 'megumin', 'bully', 'cry', 'cuddle', 'lick',
        'pat', 'smug', 'blush', 'bonk', 'yeet', 'smile', 'wave', 'highfive',
        'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'kick', 'happy',
        'wink', 'poke', 'dance', 'cringe'
    ],
    // need to handle gif to mp4 using ffmpeg native to handle gif send message
    async execute(args, {msg, socket}){
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
                const res = await axios.get(`https://api.waifu.pics/sfw/${category}`)
                const imgUrl = res.data.url
                if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                    socket.sendMessage(msg.remoteJid, { image: { url: imgUrl }, caption: `🖼️ Here's your random *${category}* image!` }, { quoted: msg.raw, ephemeralExpiration: msg.expiration })
                } else {
                    return {
                        text: '⚠️ Failed to fetch a valid image URL.',
                        outputType: 'text',
                    }
                }
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
                console.error('WaifuPics Error:', errMsg)
                socket.sendMessage(msg.remoteJid, { text: '❌ Failed to fetch anime image. Try again later.' }, { ephemeralExpiration: msg.expiration, quoted: msg.raw })
            }
        }
    }
} as ICommand