export default {
    name: "runtime",
    access: "regular",
    inGroup: false,
    usage: 'runtime',
    async execute(_, { msg, socket }: ICTX) {
        const uptime = process.uptime()

        const hours = Math.floor(uptime / 3600)
        const minutes = Math.floor((uptime % 3600) / 60)
        const seconds = Math.floor(uptime % 60)

        const text = `⏱️ Bot Uptime
${hours} Hours ${minutes} Minutes ${seconds} Second`

        await socket.sendMessage(
            msg.remoteJid,
            { text },
            { quoted: msg.raw }
        )
    }
} as ICommand