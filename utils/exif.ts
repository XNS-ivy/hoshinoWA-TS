import { randomUUID } from 'crypto'

export function addExif(
  webp: Buffer,
  packname = 'Sticker Bot',
  author = 'Bot',
  emojis: string[] = []
) {
  const exifAttr = {
    'sticker-pack-id': randomUUID(),
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    emojis
  }

  const json = Buffer.from(JSON.stringify(exifAttr), 'utf-8')

  const exif = Buffer.concat([
    Buffer.from([
      0x49, 0x49, 0x2A, 0x00,
      0x08, 0x00, 0x00, 0x00,
      0x01, 0x00,
      0x41, 0x57,
      0x07, 0x00,
      json.length, 0x00, 0x00, 0x00,
      0x16, 0x00, 0x00, 0x00
    ]),
    json
  ])

  exif.writeUInt32LE(json.length, 14)
  return Buffer.concat([
    webp.slice(0, 12),
    Buffer.from('EXIF'),
    Buffer.alloc(4),
    exif,
    webp.slice(12)
  ])
}