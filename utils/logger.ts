import colors from 'colors'

export type LogType = 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

type ColorScheme = {
    date: (text: string) => string
    type: (text: string) => string
    from: (text: string) => string
    msg: (text: string) => string
}

export class Logger {
    constructor() {}

    log(msg: string, type: LogType, from: string) {
        const time = this.getDateTime()
        const scheme = this.getScheme(type)

        const output =
            `${scheme.date(`[${time}]`)} ` +
            `${scheme.type(`[${type}]`)} ` +
            `${scheme.from(`[${from.toUpperCase()}]`)} ` +
            `${scheme.msg(msg)}`

        console.log(output)
    }

    private getScheme(type: LogType): ColorScheme {
        switch (type) {
            case 'INFO':
                return {
                    date: colors.gray,
                    type: colors.blue.bold,
                    from: colors.cyan,
                    msg: colors.white
                }

            case 'WARN':
                return {
                    date: colors.yellow,
                    type: colors.yellow.bold,
                    from: colors.yellow,
                    msg: colors.yellow
                }

            case 'ERROR':
                return {
                    date: colors.red,
                    type: colors.red.bold,
                    from: colors.red,
                    msg: colors.red
                }

            case 'FATAL':
                return {
                    date: colors.bgRed.white,
                    type: colors.bgRed.white.bold,
                    from: colors.bgRed.white,
                    msg: colors.bgRed.white.bold
                }
        }
    }

    private getDateTime(): string {
        return new Intl.DateTimeFormat('en-GB', {
            dateStyle: 'short',
            timeStyle: 'medium',
            hour12: false
        }).format(new Date())
    }
}