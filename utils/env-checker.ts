import dotenv from 'dotenv'
dotenv.config()

function isEmpty(value: string | undefined): boolean {
    return value === undefined || value.trim() === ''
}

export default function envCheckker(): void {
    const requiredEnvs = [
        'AUTH_FILE_NAME',
        'SOCKET_CHECK_TIMEOUT',
        'MAX_DIE_SOCKET',
    ]

    for (const key of requiredEnvs) {
        if (isEmpty(process.env[key])) {
            logger.log(`${key} is empty or not defined`, 'WARN', 'env check')
        }
    }
}
