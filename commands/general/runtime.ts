import os from 'os'

export default {
    name: "runtime",
    access: "regular",
    inGroup: false,
    usage: "runtime",

    async execute(_, { msg, socket }: ICTX) {
        const uptime = process.uptime()
        const mem = process.memoryUsage()
        const totalMem = os.totalmem()
        const usedMem = mem.rss

        const h = Math.floor(uptime / 3600)
        const m = Math.floor((uptime % 3600) / 60)
        const s = Math.floor(uptime % 60)

        const cpu = os.loadavg()[0] ?? 0

        const text = `🤖 *BOT STATUS*

⏱️ *Uptime*
${h} Hours ${m} Minute ${s} Second

💾 *Memory*
• Used : ${(usedMem / 1024 / 1024).toFixed(2)} MB
• Total: ${(totalMem / 1024 / 1024).toFixed(2)} MB

🧠 *CPU Load*
${cpu.toFixed(2)}

🖥️ *Runtime*
• Platform : ${process.platform}
• Node     : ${process.version}
• PID      : ${process.pid}

✅ Bot Running Normaly`

        await socket.sendMessage(
            msg.remoteJid,
            { text },
            { quoted: msg.raw }
        )
    }
} as ICommand