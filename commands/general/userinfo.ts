export default {
    name: "userinfo",
    access: "regular",
    inGroup: true,

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        const text = `👤 User Info
Name: ${msg.pushName}
Role: ${whoAMI.role}
From Group: ${msg.isOnGroup ? "Yes" : "No"}`
        const image = await socket.profilePictureUrl(msg.lid, "image")
        if (image) await socket.sendMessage(msg.remoteJid, { image: { url: image }, caption: text }, { quoted: msg.raw })
        else await socket.sendMessage(msg.remoteJid, { text: text })
    }
} as ICommand