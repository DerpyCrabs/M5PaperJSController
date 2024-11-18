export enum PrimitiveWidgetType {
  Rect = 1,
  Label = 2,
  Line = 3,
  Image = 4,
  BatteryStatus = 5,
}

export enum WidgetType {
  Rect = 'Rect',
  Label = 'Label',
  Line = 'Line',
  Button = 'Button',
  Image = 'Image',
  BatteryStatus = 'BatteryStatus',
}

export enum TextDatum {
  TopLeft = 0,
  TopCenter = 1,
  TopRight = 2,
  MiddleLeft = 3,
  MiddleCenter = 4,
  MiddleRight = 5,
  BottomLeft = 6,
  BottomCenter = 7,
  BottomRight = 8,
  LeftBaseline = 9,
  CenterBaseline = 10,
  RightBaseline = 11,
}

export type Color = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15

// Packet structure
// widgetCount: uint16
// for i in widgetCount:
//   widgetType: uint8
//   ...widgetData: depends on type

// Rect structure
// x: uint16
// y: uint16
// w: uint16
// h: uint16
// color: uint8
// roundRadius: uint8
// fill: uint8 (boolean)
export type RectWidget = {
  widgetType: WidgetType.Rect
  x: number
  y: number
  w: number
  h: number
  color: Color
  roundRadius?: number
  fill?: boolean
  id?: string
}

// Label structure
// x: uint16
// y: uint16
// textDatum: uint8
// fontSize: uint8
// color: uint8
// textLength: uint8
// ...text: textLength bits
export type LabelWidget = {
  widgetType: WidgetType.Label
  x: number
  y: number
  datum: TextDatum
  fontSize: number
  color: Color
  text: string
  id?: string
}

// Line structure
// x1: uint16
// y1: uint16
// x2: uint16
// y2: uint16
// color: uint8
export type LineWidget = {
  widgetType: WidgetType.Line
  x1: number
  y1: number
  x2: number
  y2: number
  color: Color
  id?: string
}

// Image structure
// x: uint16
// y: uint16
// w: uint16
// h: uint16
// color: uint8
// pixelData: w * h bits
export type ImageWidget = {
  widgetType: WidgetType.Image
  x: number
  y: number
  w: number
  h: number
  color: Color
  pixelData: { rows: { pixels: (0 | 1)[] }[] }
}

// BatteryStatus structure
// x: uint16
// y: uint16
// fontSize: uint8
// color: uint8
export type BatteryStatusWidget = {
  widgetType: WidgetType.BatteryStatus
  x: number
  y: number
  fontSize: number
  color: Color
}

export type ButtonWidget = {
  widgetType: WidgetType.Button
  x: number
  y: number
  w: number
  h: number
  label?: string
  borderColor?: Color
  labelColor?: Color
  labelDatum?: TextDatum
  labelSize?: number
  labelMarginLeft?: number
  id?: string
}

export type PrimitiveWidget = LabelWidget | LineWidget | RectWidget | ImageWidget | BatteryStatusWidget
export type CompositeWidget = ButtonWidget
export type Widget = CompositeWidget | PrimitiveWidget

type DataDescription = { data: number; dataType: 'uint8' | 'uint16' | 'uint32' }

function packRect(rect: RectWidget): DataDescription[] {
  return [
    { data: PrimitiveWidgetType.Rect, dataType: 'uint8' },
    { data: rect.x, dataType: 'uint16' },
    { data: rect.y, dataType: 'uint16' },
    { data: rect.w, dataType: 'uint16' },
    { data: rect.h, dataType: 'uint16' },
    { data: rect.color, dataType: 'uint8' },
    { data: rect.roundRadius || 0, dataType: 'uint8' },
    { data: rect.fill ? 1 : 0, dataType: 'uint8' },
  ]
}

function packLabel(label: LabelWidget): DataDescription[] {
  const textLength = label.text.length + 1
  const textData: DataDescription[] = label.text
    .split('')
    .map((char) => ({ data: char.charCodeAt(0), dataType: 'uint8' }))
  textData.push({ data: 0, dataType: 'uint8' }) // Null terminator
  return [
    { data: PrimitiveWidgetType.Label, dataType: 'uint8' },
    { data: label.x, dataType: 'uint16' },
    { data: label.y, dataType: 'uint16' },
    { data: label.datum, dataType: 'uint8' },
    { data: label.fontSize, dataType: 'uint8' },
    { data: label.color, dataType: 'uint8' },
    { data: textLength, dataType: 'uint8' },
    ...textData,
  ]
}

function packLine(line: LineWidget): DataDescription[] {
  return [
    { data: PrimitiveWidgetType.Line, dataType: 'uint8' },
    { data: line.x1, dataType: 'uint16' },
    { data: line.y1, dataType: 'uint16' },
    { data: line.x2, dataType: 'uint16' },
    { data: line.y2, dataType: 'uint16' },
    { data: line.color, dataType: 'uint8' },
  ]
}

function packImage(image: ImageWidget): DataDescription[] {
  const pixelData: DataDescription[] = image.pixelData.rows.flatMap((row) =>
    row.pixels.map((pixel) => ({ data: pixel, dataType: 'uint8' }))
  )
  return [
    { data: PrimitiveWidgetType.Image, dataType: 'uint8' },
    { data: image.x, dataType: 'uint16' },
    { data: image.y, dataType: 'uint16' },
    { data: image.w, dataType: 'uint16' },
    { data: image.h, dataType: 'uint16' },
    { data: image.color, dataType: 'uint8' },
    ...pixelData,
  ]
}

function packBatteryStatus(batteryStatus: BatteryStatusWidget): DataDescription[] {
  return [
    { data: PrimitiveWidgetType.BatteryStatus, dataType: 'uint8' },
    { data: batteryStatus.x, dataType: 'uint16' },
    { data: batteryStatus.y, dataType: 'uint16' },
    { data: batteryStatus.fontSize, dataType: 'uint8' },
    { data: batteryStatus.color, dataType: 'uint8' },
  ]
}

function unwrapCompositeWidgets(widgets: Widget[]): PrimitiveWidget[] {
  return widgets.flatMap((w) => {
    if (w.widgetType === WidgetType.Button) {
      const border: RectWidget = {
        color: w.borderColor !== undefined ? w.borderColor : 15,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        widgetType: WidgetType.Rect,
      }
      const label: LabelWidget | undefined = w.label
        ? {
            widgetType: WidgetType.Label,
            datum: w.labelDatum || TextDatum.MiddleCenter,
            x: w.x + (w.labelMarginLeft !== undefined ? w.labelMarginLeft : w.w / 2),
            y: w.y + w.h / 2,
            text: w.label,
            color: w.labelColor !== undefined ? w.labelColor : 15,
            fontSize: w.labelSize || 3,
          }
        : undefined
      return label ? [border, label] : [border]
    } else {
      return [w]
    }
  })
}

function calculatePayloadSize(dataDescriptions: DataDescription[]): number {
  return dataDescriptions.reduce((size, { dataType }) => {
    if (dataType === 'uint8') return size + 1
    if (dataType === 'uint16') return size + 2
    if (dataType === 'uint32') return size + 4
    return size
  }, 0)
}

export function getWidgetsPayload(widgets: Widget[]): ArrayBuffer {
  const primitiveWidgets = unwrapCompositeWidgets(widgets)
  const dataDescriptions: DataDescription[] = primitiveWidgets.flatMap((w) => {
    if (w.widgetType === WidgetType.Rect) {
      return packRect(w)
    } else if (w.widgetType === WidgetType.Label) {
      return packLabel(w)
    } else if (w.widgetType === WidgetType.Line) {
      return packLine(w)
    } else if (w.widgetType === WidgetType.Image) {
      return packImage(w)
    } else if (w.widgetType === WidgetType.BatteryStatus) {
      return packBatteryStatus(w)
    }
    return []
  })

  const payloadSize = 2 + calculatePayloadSize(dataDescriptions)
  const payload = new ArrayBuffer(payloadSize)
  const payloadView = new DataView(payload)
  let offset = 0
  payloadView.setUint16(0, primitiveWidgets.length)
  offset += 2

  dataDescriptions.forEach(({ data, dataType }) => {
    if (dataType === 'uint8') {
      payloadView.setUint8(offset, data)
      offset += 1
    } else if (dataType === 'uint16') {
      payloadView.setUint16(offset, data)
      offset += 2
    } else if (dataType === 'uint32') {
      payloadView.setUint32(offset, data)
      offset += 4
    }
  })

  return payload
}
