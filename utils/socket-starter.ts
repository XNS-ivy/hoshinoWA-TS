import sock from '@core/bot'
import dotenv from 'dotenv'
dotenv.config()
const timeout = Number(process.env.SOCKET_CHECK_TIMEOUT) == 0 ? 5 : Number(process.env.SOCKET_CHECK_TIMEOUT)

export async function start() {
    const phoneNumber = process.env.P_NUMBER ? process.env.P_NUMBER : null
    const isPairingCode = phoneNumber !== null ? true : false

    await sock.init(isPairingCode, phoneNumber)
}

export async function socketStopper() {
    setInterval(async () => {
        sock.checkDie()
    }, timeout * 1000)
}
