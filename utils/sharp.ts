import sharp from 'sharp'

type StickerOptions = {
    crop?: boolean
    quality?: number
}

export async function makeSticker(
    buffer: Buffer,
    opt: StickerOptions = {}
) {
    //  need to add sticker pack name
    const quality = opt.quality ?? 80
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

    return await pipeline
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality })
        .toBuffer()
}
