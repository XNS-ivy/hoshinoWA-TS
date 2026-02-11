import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import { writeFile, unlink, readFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'
import os from 'os'
import { writeExif } from './exif'
import { config } from '@core/bot-config'

export type AnimatedStickerOptions = {
  crop?: boolean
  fps?: number
  quality?: number
  duration?: number
  packname?: string
  publisher?: string
}

type VideoMeta = {
  fps: number
  duration: number
}

function getVideoMeta(filePath: string): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err)

      const videoStream = data.streams.find(s => s.codec_type === 'video')
      const duration = data.format.duration ?? 0
      let fps = 12
      const rateStr = videoStream?.r_frame_rate ?? videoStream?.avg_frame_rate
      if (rateStr) {
        const [num, den] = rateStr.split('/').map(Number)
        if (num && den && den > 0) fps = Math.round(num / den)
      }

      resolve({
        fps: fps,
        duration: Number(duration)
      })
    })
  })
}

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

export async function makeAnimatedSticker(
  buffer: Buffer,
  opt: AnimatedStickerOptions = {}
): Promise<Buffer> {
  const id = randomUUID()
  const tmpDir = os.tmpdir()
  const input = path.join(tmpDir, `${id}.mp4`)
  const output = path.join(tmpDir, `${id}.webp`)

  const creator = {
    packname: await config.getConfig('name'),
    publisher: await config.getConfig('publisher'),
  }

  await writeFile(input, buffer)

  // Baca metadata dari source video
  const meta = await getVideoMeta(input)

  const quality = opt.quality ?? 80
  const crop = opt.crop ?? false
  const packname = opt.packname ?? creator.packname
  const publisher = opt.publisher ?? creator.publisher

  // Pakai fps source, user tidak bisa override
  const fps = meta.fps

  // Jika user set duration, pastikan tidak melebihi duration source
  // Jika tidak di-set, pakai duration source
  const duration = opt.duration
    ? Math.min(opt.duration, meta.duration)
    : meta.duration

  const vf = crop
    ? `crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=${fps}`
    : `scale=512:512:force_original_aspect_ratio=decrease,fps=${fps},pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000`

  await new Promise<void>((resolve, reject) => {
    ffmpeg(input)
      .noAudio()
      .inputOptions([`-t ${duration}`])
      .outputOptions([
        '-vf', vf,
        '-loop', '0',
        '-quality', String(quality)
      ])
      .on('end', () => resolve())
      .on('error', reject)
      .save(output)
  })

  let webpBuffer = await readFile(output)

  if (packname || publisher) {
    webpBuffer = Buffer.from(await writeExif(webpBuffer, packname, publisher))
  }

  await unlink(input)
  await unlink(output)

  return webpBuffer
}