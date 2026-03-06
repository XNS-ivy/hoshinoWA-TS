import { translate, languages } from 'google-translate-api-x'

async function translateLanguage(text: string, to: string) {
    const res = await translate(text, { to })
    return {
        from: res.from.language.iso,
        to,
        text: res.text,
    }
}

function getLanguage(code: string): string {
    return languages[code as keyof typeof languages] ?? 'Unknown'
}

function findLanguage(name: string): { code: string, name: string } | undefined {
    const lower = name.toLowerCase()
    const perfect = Object.entries(languages).find(([_, lang]) => lang.toLowerCase() === lower)
    if (perfect) return { code: perfect[0], name: perfect[1] }
    const partial = Object.entries(languages).find(([_, lang]) => lang.toLowerCase().includes(lower))
    if (partial) return { code: partial[0], name: partial[1] }
    return undefined
}

function isValidLanguageCode(code: string): boolean {
    return Object.keys(languages).includes(code)
}

export default {
    name: ['translate', 'ts'],
    category: 'tools',
    usage: ['translate <country code> <text>', 'translate <country code> (reply message)', 'translate languages', 'translate find <name>'],
    async execute(args, { msg, socket }) {
        logger.log(JSON.stringify({
            hasQuoted: !!msg.quoted,
            quotedType: msg.quoted?.type,
            quotedText: msg.quoted?.text,
            quotedCaption: msg.quoted?.caption,
            quotedDescription: msg.quoted?.description,
        }), 'ERROR', 'translate')
        if (!args[0]) {
            return socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Please provide arguments.\n\nUsage:\ntranslate id I love you\ntranslate id (reply a message)\ntranslate languages\ntranslate find Indonesian' },
                { quoted: msg.raw }
            )
        }

        const [cmd, ...rest] = args as string[]
        if (!cmd) return

        if (cmd === 'languages') {
            const list = Object.entries(languages)
                .map(([code, name]) => `• ${code} - ${name}`)
                .join('\n')
            return socket.sendMessage(
                msg.remoteJid,
                { text: `🌐 *Supported Languages:*\n\n${list}` },
                { quoted: msg.raw }
            )
        }

        if (cmd === 'find') {
            if (!rest.length) {
                return socket.sendMessage(
                    msg.remoteJid,
                    { text: '❌ Please provide a language name.\nExample: translate find Indonesian' },
                    { quoted: msg.raw }
                )
            }
            const result = findLanguage(rest.join(' '))
            if (!result) {
                return socket.sendMessage(
                    msg.remoteJid,
                    { text: `❌ Language *"${rest.join(' ')}"* not found.` },
                    { quoted: msg.raw }
                )
            }
            return socket.sendMessage(
                msg.remoteJid,
                { text: `✅ *Found:*\n• Name: ${result.name}\n• Code: ${result.code}` },
                { quoted: msg.raw }
            )
        }

        if (!isValidLanguageCode(cmd.toLowerCase())) {
            return socket.sendMessage(
                msg.remoteJid,
                { text: `❌ Language code *"${cmd}"* is not supported.\nUse *translate languages* to see all supported codes.` },
                { quoted: msg.raw }
            )
        }

        let textToTranslate: string | null = null

        if (rest.length > 0) {
            textToTranslate = rest.join(' ')
        } else if (msg.quoted) {
            textToTranslate = msg.quoted.text ?? msg.quoted.caption ?? null
        }

        if (!textToTranslate) {
            return socket.sendMessage(
                msg.remoteJid,
                { text: '❌ No text to translate.\nProvide text directly or reply to a message containing text.' },
                { quoted: msg.raw }
            )
        }

        try {
            const result = await translateLanguage(textToTranslate, cmd.toLowerCase())
            const fromLang = getLanguage(result.from ?? '')
            const toLang = getLanguage(result.to ?? '')

            return socket.sendMessage(
                msg.remoteJid,
                {
                    text:
                        `🌐 *Translated*\n` +
                        `• From: ${fromLang} (${result.from?.toUpperCase()})\n` +
                        `• To: ${toLang} (${result.to?.toUpperCase()})\n` +
                        `• Original: ${textToTranslate}\n\n` +
                        `📝 *Result:*\n${result.text}`
                },
                { quoted: msg.raw }
            )
        } catch (err) {
            logger.log(err as string, 'ERROR', 'translate')
            return socket.sendMessage(
                msg.remoteJid,
                { text: '❌ Failed to translate. Make sure the language code is correct.' },
                { quoted: msg.raw }
            )
        }
    },
} as ICommand