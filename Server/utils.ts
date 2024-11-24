import bmp from 'bmp-js'
import fs from 'node:fs'
import type { ImageWidget } from './widgets'

export function readBmpIcon(path: string): ImageWidget['pixelData'] {
  const bmpData = bmp.decode(fs.readFileSync(path))
  const w = bmpData.width
  const h = bmpData.height
  const data: ImageWidget['pixelData'] = { rows: [...Array(h)].map(() => ({ pixels: [...Array(w).fill(0)] })) }

  data.rows.forEach((row, i) => {
    row.pixels.forEach((pixel, j) => {
      const r = bmpData.data[i * 4 * h + j * 4 + 1]
      data.rows[i].pixels[j] = r !== 0 ? 0 : 1
    })
  })

  return data
}
