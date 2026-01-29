import axios from 'axios'
import fs from 'fs'

export async function downloadFile(url: string, output: string) {
  const res = await axios.get(url, { responseType: 'stream' })
  const writer = fs.createWriteStream(output)

  res.data.pipe(writer)

  return new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}