import { convertLID } from "@local_modules/whatsapp/msg-processing"
import { ownerHandler } from '@core/owner'

export default {
    name: 'set-owner-level',
    access: "master",
    usage: ['set-owner-level <@mention|lid> <owner|master>'],
    category: 'owner',

    async execute(args, { msg, socket, whoAMI }: ICTX) {
        if (!whoAMI.ownerRole || whoAMI.ownerRole !== 'master') {
            return await socket.sendMessage(msg.remoteJid, {
                text: whoAMI.ownerRole === 'owner'
                    ? '❌ Your owner level does not meet the requirements to change owner level.'
                    : '❌ You do not have permission to do this.'
            }, { quoted: msg.raw })
        }
        const lastArg = args[args.length - 1]
        const level: 'owner' | 'master' | null = (lastArg === 'master' || lastArg === 'owner')
            ? lastArg
            : null

        if (!level) {
            return await socket.sendMessage(msg.remoteJid, {
                text: `❌ Level is required.\nUsage: set-owner-level <@mention|lid> <owner|master>`
            }, { quoted: msg.raw })
        }

        const targets: string[] = []

        if (msg.mentionedJid?.length) {
            for (const jid of msg.mentionedJid) {
                const converted = convertLID(jid)
                if (converted) targets.push(converted)
            }
        } else {
            const lidArgs = args.filter(a => a !== 'owner' && a !== 'master')
            for (const arg of lidArgs) {
                const converted = convertLID(arg.includes('@') ? arg : `${arg}@lid`)
                if (converted) targets.push(converted)
            }
        }

        if (targets.length === 0 && msg.quoted) {
            const quotedLid = convertLID(msg.raw?.message?.extendedTextMessage?.contextInfo?.participant ?? null)
            if (quotedLid) targets.push(quotedLid)
        }

        if (targets.length === 0) {
            return await socket.sendMessage(msg.remoteJid, {
                text: `❌ No valid targets.\nUse: mention, reply to message, or send LID directly.`
            }, { quoted: msg.raw })
        }

        const results: string[] = []
        for (const lid of targets) {
            try {
                await ownerHandler.changeLevel(lid, level)
                results.push(`✅ ${lid} → ${level}`)
            } catch (err: any) {
                results.push(`❌ ${lid} → ${err?.message}`)
            }
        }

        await socket.sendMessage(msg.remoteJid, {
            text: `*Set Owner Level Result:*\n${results.join('\n')}`
        }, { quoted: msg.raw })
    }
} as ICommand