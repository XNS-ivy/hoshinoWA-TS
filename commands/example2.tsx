export default {
    name: 'example2',
    access: "premium",
    inGroup: true,
    inGroupAccess: "member",
    args: ["args1", "args2"],

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        await socket.sendMessage(msg.remoteJid, {
            text: `Command example running\nArgs: ${args.join(", ")}`
        })
    }
} as ICommand