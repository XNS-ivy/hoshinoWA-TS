import type { Logger } from '@utils/logger'
import type { WASocket } from 'baileys'
import type { IMessageFetch } from '@local_modules/whatsapp/msg-processing'

declare global {
    var logger: Logger
    interface ICTX {
        msg: IMessageFetch
        socket: WASocket
        whoAMI: {
            role: "private" | "admin" | "member"
        }
    }

    interface ICommand {
        name: string
        access?: "owner" | "regular" | "premium"
        inGroup?: boolean
        inGroupAccess?: "admin" | "member"
        args?: string[]
        usage: string | Array<string> | undefined | null | Function
        category: string
        execute: (
            args: string[],
            ctx: ICTX
        ) => Promise<void> | void
    }
}

export { }