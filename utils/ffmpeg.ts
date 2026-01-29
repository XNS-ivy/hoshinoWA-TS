import ffmpeg from 'fluent-ffmpeg'

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