import fs from 'fs'
import path from 'path'
import colors from 'colors'

export type LogType = 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

type ColorScheme = {
    date: (text: string) => string
    type: (text: string) => string
    from: (text: string) => string
    msg: (text: string) => string
}

export class Logger {
    private logDir = path.resolve('logs')

    constructor() {
        this.ensureLogDir()
    }

    log(msg: string, type: LogType, from: string) {
        const time = this.getDateTime()
        const scheme = this.getScheme(type)

        const consoleOutput =
            `${scheme.date(`[${time}]`)} ` +
            `${scheme.type(`[${type}]`)} ` +
            `${scheme.from(`[${from.toUpperCase()}]`)} ` +
            `${scheme.msg(msg)}`

        console.log(consoleOutput)
        if (type === 'ERROR' || type === 'FATAL') {
            this.writeToFile(time, type, from, msg)
        }
    }

    private ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true })
        }
    }

    private writeToFile(
        time: string,
        type: LogType,
        from: string,
        msg: string
    ) {
        const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        const file = path.join(this.logDir, `${date}.log`)

        const line =
            `[${time}] [${type}] [${from.toUpperCase()}] ${msg}\n`

        try {
            fs.appendFileSync(file, line, 'utf-8')
        } catch (err) {
            console.error('FAILED TO WRITE LOG FILE'.red.bold, err)
        }
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
                    date: colors.gray,
                    type: colors.yellow.bold,
                    from: colors.yellow,
                    msg: colors.yellow
                }

            case 'ERROR':
                return {
                    date: colors.gray,
                    type: colors.red.bold,
                    from: colors.red,
                    msg: colors.red
                }

            case 'FATAL':
                return {
                    date: colors.gray,
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