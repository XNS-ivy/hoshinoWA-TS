import axios from 'axios'
import fs from 'fs'
import { pipeline } from 'stream/promises'

export async function downloadFile(url: string, dest: string) {
    const res = await axios.get(url, { responseType: 'stream', headers: {
        "User-Agent": ""
    } })

    await pipeline(
        res.data,
        fs.createWriteStream(dest)
    )
}