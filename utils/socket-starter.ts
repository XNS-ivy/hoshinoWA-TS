import sock from '@core/bot'
import dotenv from 'dotenv'
dotenv.config()
const timeout = !Number.isNaN(Number(process.env.SOCKET_CHECK_TIMEOUT)) ? 5 : Number(process.env.SOCKET_CHECK_TIMEOUT)

export async function start() {
    await sock.init(connectionMethod().isPairingCode, connectionMethod().phoneNumber)
}


export async function socketStopper() {
    setInterval(async () => {
        sock.checkDie()
    }, timeout * 1000)
}

function connectionMethod() {
    const phoneNumber = process.env.P_NUMBER ? process.env.P_NUMBER : null
    const isPairingCode = !!phoneNumber

    return {
        phoneNumber,
        isPairingCode,
    }
}