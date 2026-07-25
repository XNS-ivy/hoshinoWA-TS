import fs from 'fs'
import { downloadFile } from '@utils/axios'
import { validateGif } from '@utils/ffmpeg'

export async function downloadGifPipeline(
    url: string,
    dest: string,
    retry = 2
): Promise<void> {
    for (let attempt = 0; attempt <= retry; attempt++) {
        try {
            await downloadFile(url, dest)
            await validateGif(dest)
            return
        } catch (err) {
            if (attempt === retry) throw err
            await fs.promises.rm(dest, { force: true })
        }
    }
}
