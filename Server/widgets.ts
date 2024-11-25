export enum WidgetType {
  Rect = 1,
  Label = 2,
  Line = 3,
  Image = 4,
  BatteryStatus = 5,
  Temperature = 6,
  Humidity = 7,
  TouchArea = 999,
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

export enum UpdateMode {
  UpdateModeGC16 = 2,
  UpdateModeDU4 = 6, // Default
}

export type Color = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15

// Packet structure
// updateTimer: uint32
// updateMode: uint8
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

// Temperature structure
// x: uint16
// y: uint16
// fontSize: uint8
// color: uint8
export type TemperatureWidget = {
  widgetType: WidgetType.Temperature
  x: number
  y: number
  fontSize: number
  color: Color
}

// Humidity structure
// x: uint16
// y: uint16
// fontSize: uint8
// color: uint8
export type HumidityWidget = {
  widgetType: WidgetType.Humidity
  x: number
  y: number
  fontSize: number
  color: Color
}

export type TouchAreaWidget = {
  widgetType: WidgetType.TouchArea
  x: number
  y: number
  w: number
  h: number
  id: any
}

export type Widget =
  | LabelWidget
  | LineWidget
  | RectWidget
  | ImageWidget
  | BatteryStatusWidget
  | TemperatureWidget
  | HumidityWidget
  | TouchAreaWidget

type DataDescription = { data: number; dataType: 'uint8' | 'uint16' | 'uint32' }

export type PayloadInfo = { widgets: Widget[]; updateTimer?: number; updateMode?: UpdateMode }

function packRect(rect: RectWidget): DataDescription[] {
  return [
    { data: WidgetType.Rect, dataType: 'uint8' },
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
    { data: WidgetType.Label, dataType: 'uint8' },
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
    { data: WidgetType.Line, dataType: 'uint8' },
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
    { data: WidgetType.Image, dataType: 'uint8' },
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
    { data: WidgetType.BatteryStatus, dataType: 'uint8' },
    { data: batteryStatus.x, dataType: 'uint16' },
    { data: batteryStatus.y, dataType: 'uint16' },
    { data: batteryStatus.fontSize, dataType: 'uint8' },
    { data: batteryStatus.color, dataType: 'uint8' },
  ]
}

function packTemperature(temperature: TemperatureWidget): DataDescription[] {
  return [
    { data: WidgetType.Temperature, dataType: 'uint8' },
    { data: temperature.x, dataType: 'uint16' },
    { data: temperature.y, dataType: 'uint16' },
    { data: temperature.fontSize, dataType: 'uint8' },
    { data: temperature.color, dataType: 'uint8' },
  ]
}

function packHumidity(humidity: HumidityWidget): DataDescription[] {
  return [
    { data: WidgetType.Humidity, dataType: 'uint8' },
    { data: humidity.x, dataType: 'uint16' },
    { data: humidity.y, dataType: 'uint16' },
    { data: humidity.fontSize, dataType: 'uint8' },
    { data: humidity.color, dataType: 'uint8' },
  ]
}

function calculatePayloadSize(dataDescriptions: DataDescription[]): number {
  return dataDescriptions.reduce((size, { dataType }) => {
    if (dataType === 'uint8') return size + 1
    if (dataType === 'uint16') return size + 2
    if (dataType === 'uint32') return size + 4
    return size
  }, 0)
}

export function composePayloadInfo(payloadInfo: PayloadInfo[]): PayloadInfo {
  return {
    updateTimer: Math.min(...payloadInfo.flatMap((p) => (p.updateTimer ? [p.updateTimer] : []))),
    updateMode: payloadInfo.some((p) => p.updateMode === UpdateMode.UpdateModeGC16)
      ? UpdateMode.UpdateModeGC16
      : UpdateMode.UpdateModeDU4,
    widgets: payloadInfo.flatMap((p) => p.widgets),
  }
}

export function getPayload({ widgets, updateTimer, updateMode }: PayloadInfo): ArrayBuffer {
  const dataDescriptions: DataDescription[] = [
    { data: updateTimer || 0, dataType: 'uint32' },
    { data: updateMode || UpdateMode.UpdateModeDU4, dataType: 'uint8' },
    { data: widgets.filter((w) => w.widgetType !== WidgetType.TouchArea).length, dataType: 'uint16' },
    ...widgets.flatMap((w) => {
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
      } else if (w.widgetType === WidgetType.Temperature) {
        return packTemperature(w)
      } else if (w.widgetType === WidgetType.Humidity) {
        return packHumidity(w)
      }
      return []
    }),
  ]

  const payload = new ArrayBuffer(calculatePayloadSize(dataDescriptions))
  const payloadView = new DataView(payload)
  let offset = 0
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
