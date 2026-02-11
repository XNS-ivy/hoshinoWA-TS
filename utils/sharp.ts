import sharp from 'sharp'
import { writeExif } from './exif'
import { config } from '@core/bot-config'

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

    const creator = {
        packname: await config.getConfig('name'),
        publisher: await config.getConfig('publisher'),
    }
    
    const quality = opt.quality ?? 80
    const packname = opt.packname ?? creator.packname
    const publisher = opt.publisher ?? creator.publisher

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