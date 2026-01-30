import fs from 'fs'

export async function safeUnlink(path?: string) {
    if (!path) return
    try {
        await fs.promises.unlink(path)
    } catch (e) {
        if ((e as any).code !== 'ENOENT') {
            console.warn('[safeUnlink]', e)
        }
    }
}