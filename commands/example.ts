const command: ICommand = {
    name: "example",
    access: ["owner", "regular", "premium"],
    inGroup: true,
    inGroupAccess: ["admin", "member"],
    args: ["args1", "args2"],

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        await socket.sendMessage(msg.remoteJid, {
            text: `Command example running\nArgs: ${args.join(", ")}`
        })
    }
}

export default command