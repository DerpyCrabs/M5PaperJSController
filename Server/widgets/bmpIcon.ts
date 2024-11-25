import { WidgetType, type ImageWidget } from '../widgets'
import { readBmpIcon } from '../utils'

export function bmpIconWidget({ x, y, path }: { x: number; y: number; path: string }): ImageWidget {
  const pixelData = readBmpIcon(path)
  const w = pixelData.rows[0].pixels.length
  const h = pixelData.rows.length
  return {
    widgetType: WidgetType.Image,
    x,
    y,
    w,
    h,
    pixelData,
  }
}
