import fs from 'fs'

export async function isPlaceholder(path: string): Promise<boolean> {
    const buf = await fs.promises.readFile(path, { encoding: null })
    const head = buf.slice(0, 64).toString('utf8').toLowerCase()

    return (
        head.includes('this image is unavailable') ||
        head.includes('<html') ||
        head.includes('<svg')
    )
}
