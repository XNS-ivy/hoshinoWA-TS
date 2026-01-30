import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'

export async function gifToMP4(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions([
        '-movflags faststart',
        '-pix_fmt yuv420p',
        '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-profile:v baseline',
        '-level 3.0',
        '-r 30',
        '-an'
      ])
      .save(output)
      .on('start', () => {
        logger.log(`Executing FFMPEG`, 'INFO', 'ffmpeg')
      })
      .on('end', () => resolve())
      .on('error', err => reject(err))
  })
}

export async function validateGif(path: string): Promise<void> {
    const stat = await fs.promises.stat(path)

    if (stat.size < 50 * 1024) {
        throw new Error(`GIF too small (${stat.size})`)
    }

    const fd = await fs.promises.open(path, 'r')

    const header = Buffer.alloc(6)
    await fd.read(header, 0, 6, 0)

    const sig = header.toString('ascii')
    if (sig !== 'GIF87a' && sig !== 'GIF89a') {
        await fd.close()
        throw new Error(`Invalid GIF header: ${sig}`)
    }

    const tail = Buffer.alloc(1)
    await fd.read(tail, 0, 1, stat.size - 1)
    await fd.close()

    if (tail[0] !== 0x3B) {
        throw new Error('GIF missing trailer')
    }
    await new Promise<void>((resolve, reject) => {
        ffmpeg.ffprobe(path, (err, data) => {
            if (err) return reject(err)
            if (!data.streams?.length) {
                return reject(new Error('No media streams'))
            }
            resolve()
        })
    })
}