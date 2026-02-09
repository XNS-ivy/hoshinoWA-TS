import { config } from '@core/bot-config'

export default {
    name: "math",
    access: "regular",
    args: ["expression"],
    usage: [
        'math 1 + 2',
        'math 1 + 2 * 3',
        'math 10 x 2 - 5 / 5'
    ],
    async execute(args, { msg, socket }: ICTX) {
        const prefix = await config.getConfig('prefix')

        if (args.length < 3 || args.length % 2 === 0) {
            await socket.sendMessage(
                msg.remoteJid,
                {
                    text: `❌ Usage:\n${prefix}math <number> <operator> <number> [operator number ...]`
                },
                { quoted: msg.raw }
            )
            return
        }

        let result = Number(args[0])

        if (isNaN(result)) {
            await socket.sendMessage(
                msg.remoteJid,
                { text: "❌ The first argument must be a number" },
                { quoted: msg.raw }
            )
            return
        }

        for (let i = 1; i < args.length; i += 2) {
            const op = args[i]
            const next = Number(args[i + 1])

            if (isNaN(next)) {
                await socket.sendMessage(
                    msg.remoteJid,
                    { text: `❌ "${args[i + 1]}" Not a number` },
                    { quoted: msg.raw }
                )
                return
            }

            switch (op) {
                case "+":
                    result += next
                    break
                case "-":
                    result -= next
                    break
                case "*":
                case "x":
                    result *= next
                    break
                case "/":
                    if (next === 0) {
                        await socket.sendMessage(
                            msg.remoteJid,
                            { text: "❌ Cannot be divided by 0" },
                            { quoted: msg.raw }
                        )
                        return
                    }
                    result /= next
                    break
                default:
                    await socket.sendMessage(
                        msg.remoteJid,
                        { text: `❌ Invalid operator: ${op}` },
                        { quoted: msg.raw }
                    )
                    return
            }
        }

        await socket.sendMessage(
            msg.remoteJid,
            {
                text: `🧮 Result:\n${args.join(" ")} = ${result}`
            },
            { quoted: msg.raw }
        )
    }
} as ICommand