import sharp from 'sharp'
import { writeExif } from './exif'

type StickerOptions = {
    crop?: boolean
    quality?: number
    packname?: string
    publisher?: string
}

export async function makeSticker(
    buffer: Buffer,
    opt: StickerOptions = {}
): Promise<Buffer> {
    const quality = opt.quality ?? 80
    const packname = opt.packname ?? 'hoshino-bot'
    const publisher = opt.publisher ?? 'XNS-ivy'
    
    const image = sharp(buffer)
    const meta = await image.metadata()

    let pipeline = image

    if (opt.crop && meta.width && meta.height) {
        const size = Math.min(meta.width, meta.height)

        pipeline = pipeline.extract({
            left: Math.floor((meta.width - size) / 2),
            top: Math.floor((meta.height - size) / 2),
            width: size,
            height: size
        })
    }

    const webpBuffer = await pipeline
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality })
        .toBuffer()

    if (packname || publisher) {
        return await writeExif(webpBuffer, packname, publisher)
    }

    return webpBuffer
}