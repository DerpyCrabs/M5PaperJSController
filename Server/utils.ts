import bmp from 'bmp-js'
import fs from 'node:fs'
import type { ImageWidget, Color } from './widgets'
function rgbToGrayscale(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}
function mapTo16ColorPalette(grayscaleValue: number): Color {
  return Math.round(grayscaleValue * 15) as Color
}
export function readBmpIcon(path: string): ImageWidget['pixelData'] {
  const bmpData = bmp.decode(fs.readFileSync(path))
  const w = bmpData.width
  const h = bmpData.height
  const data: ImageWidget['pixelData'] = { rows: [...Array(h)].map(() => ({ pixels: [...Array(w).fill(0 as Color)] })) }

  data.rows.forEach((row, i) => {
    row.pixels.forEach((pixel, j) => {
      const r = bmpData.data[i * 4 * h + j * 4 + 1] / 255
      const g = bmpData.data[i * 4 * h + j * 4 + 2] / 255
      const b = bmpData.data[i * 4 * h + j * 4 + 3] / 255
      const color = mapTo16ColorPalette(1 - rgbToGrayscale(r, g, b))
      data.rows[i].pixels[j] = color
    })
  })

  return data
}
