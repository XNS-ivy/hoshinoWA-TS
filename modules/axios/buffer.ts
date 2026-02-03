import axios from 'axios'

async function getBuffer(url: string): Promise<Buffer> {
    logger.log('Downloading url with axios buffer', 'INFO', 'axios buffer')
    const res = await axios.get(url, { responseType: 'arraybuffer' })
    return Buffer.from(res.data)
}

async function gifToMp4(gifUrl: string): Promise<string> {
    // uncomplete
    const res = await axios.get(
        `https://example.com/convert?url=${encodeURIComponent(gifUrl)}`
    )
    return res.data.mp4
}

export { getBuffer, gifToMp4}

