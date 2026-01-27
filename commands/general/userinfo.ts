export default {
    name: "userinfo",
    access: "regular",
    inGroup: true,
    usage: 'userinfo',
    async execute(_, { msg, socket, whoAMI }: ICTX) {
        const res = await socket.fetchStatus(msg.lid)
        type StatusItem = { status?: { status?: string } }
        const statusArr = Array.isArray(res) ? (res as StatusItem[]) : []
        const bioRaw = statusArr[0]?.status?.status ?? ""
        const bio = bioRaw.trim() ? bioRaw : "- No biodata -"

        const text = `👤 User Info
📇 Name: ${msg.pushName}
🎭 Role: ${whoAMI.role}
📝 Biodata: ${bio}`
        const image = await socket.profilePictureUrl(msg.lid, "image")
        if (image) await socket.sendMessage(msg.remoteJid, { image: { url: image }, caption: text }, { quoted: msg.raw })
        else await socket.sendMessage(msg.remoteJid, { text: text })
    }
} as ICommand