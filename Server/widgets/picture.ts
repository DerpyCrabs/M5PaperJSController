import { WidgetType, type Widget } from '../widgets'
import { readImage } from '../utils'

export async function pictureWidget({
  path,
  x,
  y,
  w,
  h,
}: {
  path: string
  x: number
  y: number
  w: number
  h: number
}): Promise<Widget> {
  const pixelData = await readImage(path, { w, h })

  return {
    widgetType: WidgetType.Image,
    x,
    y,
    pixelData,
  }
}
