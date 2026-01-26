export default {
    name: "math",
    access: "regular",
    args: ["a", "operator", "b"],

    async execute(args, { msg, socket }: ICTX) {
        if (args.length < 3) {
            await socket.sendMessage(msg.remoteJid, {
                text: "❌ Usage: math <a> <+|-|*|/> <b>"
            })
            return
        }

        const a = Number(args[0])
        const op = args[1]
        const b = Number(args[2])

        if (isNaN(a) || isNaN(b)) {
            await socket.sendMessage(msg.remoteJid, { text: "❌ A and B must be numbers" }, { quoted: msg.raw })
            return
        }

        let result: number

        switch (op) {
            case "+": result = a + b; break
            case "-": result = a - b; break
            case "*":
            case "x": result = a * b; break
            case "/": result = b === 0 ? NaN : a / b; break
            default:
                await socket.sendMessage(msg.remoteJid, { text: "❌ Invalid operator" }, { quoted: msg.raw })
                return
        }

        await socket.sendMessage(msg.remoteJid, {
            text: `🧮 Result: ${a} ${op} ${b} = ${result}`
        }, { quoted: msg.raw })
    }
} as ICommand