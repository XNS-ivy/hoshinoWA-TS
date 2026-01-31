import { type WAMessage, type proto, type WAMessageKey, getContentType } from "baileys"
import { config as conf } from "@core/bot-config"


export class MessageParse {
    private static denied: (keyof proto.IMessage)[] = [
        "protocolMessage",
        "senderKeyDistributionMessage",
        "messageContextInfo",
    ]
    private config = conf

    async fetch(msg: WAMessage): Promise<IMessageFetch | null> {
        const { key, pushName, message } = msg
        const { remoteJid } = key
        const lid = this.getLID(key)
        const messageTimestamp = Date.now()
        if (!message || !pushName) return null
        if (remoteJid === "status@broadcast" || !remoteJid) return null

        const m = message as proto.IMessage
        const res: Partial<Record<keyof proto.IMessage, any>> = {}

        for (const k of Object.keys(m) as (keyof proto.IMessage)[]) {
            if (!MessageParse.denied.includes(k)) {
                res[k] = m[k]
            }
        }

        const messageObject = getContentType(m) as keyof proto.IMessage
        if (!messageObject) return null

        const content = res[messageObject]
        const { text, description, caption, contextInfo, expiration } = content || {}
        const { quotedMessage, mentionedJid } = contextInfo || {}
        const chatExpiration = expiration > 0 ? expiration : 0
        const quoted = quotedMessage
            ? await this.quotedMessageFetch(quotedMessage)
            : null
        const isOnGroup = remoteJid.endsWith('@g.us') ? true : false
        const prefix = await this.config.getConfig('prefix')
        const body = text ?? caption ?? ""
        let commandContent: null | { cmd: string; args: string[] } = null
        if (body.startsWith(prefix)) {
            const parts = body
                .slice(prefix.length)
                .trim()
                .split(/\s+/)
            const cmd = parts.shift() ?? ""
            const args = parts
            commandContent = {
                cmd,
                args
            }
        }
        if (!lid) return null
        return {
            remoteJid,
            lid,
            key,
            pushName,
            isOnGroup,
            messageTimestamp,
            type: messageObject,
            text,
            caption,
            description,
            expiration: chatExpiration,
            mentionedJid,
            quoted,
            raw: msg,
            rawQuoted: quotedMessage ?? null,
            commandContent,
        }
    }

    private async quotedMessageFetch(qMsg: proto.IMessage): Promise<IQuotedMessage | null> {
        if (!qMsg) return null
        const extracted = this.extractQuoted(qMsg)
        if (!extracted) return null

        const quotedType = getContentType(extracted) as keyof proto.IMessage
        const quotedContent: any = extracted[quotedType]

        return {
            type: quotedType,
            text: quotedContent?.text ?? null,
            caption: quotedContent?.caption ?? null,
            description: quotedContent?.description ?? null,
            expiration: quotedContent?.expiration ?? 0,
            mentionedJid: quotedContent?.contextInfo?.mentionedJid ?? [],
            rawQuoted: extracted,
        }
    }

    private extractQuoted(quotedMessage: proto.IMessage | undefined): proto.IMessage | null {
        if (!quotedMessage) return null

        const msg = quotedMessage as proto.IMessage | undefined
        if (!msg) return null

        const keys = Object.keys(msg) as (keyof proto.IMessage)[]
        const main = keys.find(k => !MessageParse.denied.includes(k))
        if (!main) return null

        return {
            [main]: msg[main]
        }
    }

    getLID(key: WAMessageKey): string | null {
        const lid = key?.remoteJid?.endsWith('@lid')
            ? key.remoteJid
            : key?.participant?.endsWith('@lid')
                ? key.participant
                : null
        return lid
    }
}

export interface IMessageParse {
    fetch(message: WAMessage): Promise<IMessageFetch | null>
}

interface IKeyFetch {
    remoteJid: string,
    lid: string,
    key: WAMessageKey,
}

export interface IMessageFetch extends IKeyFetch {
    pushName: string | null | undefined,
    isOnGroup: boolean
    messageTimestamp: number,
    type: keyof proto.IMessage,
    messageObject?: string,
    text: string | null | undefined,
    caption: string | null | undefined,
    description: string | null | undefined,
    expiration: number,
    mentionedJid: Array<string> | [],
    quoted: IQuotedMessage | null,
    raw: WAMessage,
    rawQuoted?: proto.IMessage | null,
    commandContent: null | {
        cmd: string,
        args: Array<string>,
    }
    // add more type here if needed
}

interface IQuotedMessage {
    type: keyof proto.IMessage,
    text: string | null,
    caption: string | null,
    description: string | null,
    expiration: number,
    mentionedJid: Array<string | null>,
    rawQuoted: proto.IMessage,
}

export const message = new MessageParse()