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
        access?: Array<"owner" | "regular" | "premium">
        inGroup?: boolean
        inGroupAccess?: Array<"admin" | "member">
        args?: string[]
        execute: (
            args: string[],
            ctx: ICTX
        ) => Promise<void> | void
    }
}

export { }