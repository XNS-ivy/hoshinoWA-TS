import fs from 'fs'

export async function safeUnlink(file?: string) {
    if (!file) return
    try {
        if (fs.existsSync(file)) fs.unlinkSync(file)
    } catch (e) {
        logger.log(`Failed to cleanup file: ${file}`, 'WARN', 'temp-cleanup')
    }
}