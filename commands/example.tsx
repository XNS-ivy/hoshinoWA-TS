export default {
    name: 'example2',
    access: "premium",
    inGroup: true,
    inGroupAccess: "member",
    args: ["args1", "args2"],
    usage: ['example2', 'exmpl2'],
    category: 'example',
    // custom: any
    async execute(args, { msg, socket, whoAMI }: ICTX) {
        await socket.sendMessage(msg.remoteJid, {
            text: `Command example running\nArgs: ${args.join(", ")}`
        })
    }
} as ICommand

// this type example is works and safe fr
// please dont judge me because its just example of my commands :(