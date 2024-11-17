export enum WidgetType {
  Button = 1,
  Label = 2,
  Line = 3,
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

// Button structure
// x: uint16
// y: uint16
// w: uint16
// h: uint16
// color: uint8
export type ButtonWidget = {
  widgetType: WidgetType.Button
  x: number
  y: number
  w: number
  h: number
  color: Color
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

export type Widget = ButtonWidget | LabelWidget | LineWidget

function packButton(view: DataView, offset: number, button: ButtonWidget): number {
  view.setUint8(offset, WidgetType.Button)
  view.setUint16(offset + 1, button.x)
  view.setUint16(offset + 3, button.y)
  view.setUint16(offset + 5, button.w)
  view.setUint16(offset + 7, button.h)
  view.setUint8(offset + 9, button.color)
  return getWidgetPayloadSize(button)
}

function packLabel(view: DataView, offset: number, label: LabelWidget): number {
  view.setUint8(offset, WidgetType.Label)
  view.setUint16(offset + 1, label.x)
  view.setUint16(offset + 3, label.y)
  view.setUint8(offset + 5, label.datum)
  view.setUint8(offset + 6, label.fontSize)
  view.setUint8(offset + 7, label.color)
  view.setUint8(offset + 8, label.text.length + 1)
  let currentOffset = offset + 9
  label.text.split('').forEach((char) => {
    view.setUint8(currentOffset, char.charCodeAt(0))
    currentOffset += 1
  })
  view.setUint8(currentOffset, 0)
  return getWidgetPayloadSize(label)
}

function packLine(view: DataView, offset: number, line: LineWidget): number {
  view.setUint8(offset, WidgetType.Line)
  view.setUint16(offset + 1, line.x1)
  view.setUint16(offset + 3, line.y1)
  view.setUint16(offset + 5, line.x2)
  view.setUint16(offset + 7, line.y2)
  view.setUint8(offset + 9, line.color)
  return getWidgetPayloadSize(line)
}

function getWidgetPayloadSize(widget: Widget): number {
  if (widget.widgetType === WidgetType.Button) {
    return 10
  } else if (widget.widgetType === WidgetType.Label) {
    return 9 + widget.text.length + 1
  } else if (widget.widgetType === WidgetType.Line) {
    return 10
  } else {
    throw new Error(`Unsupported widget type ${(widget as any).widgetType}`)
  }
}

export function getWidgetsPayload(widgets: Widget[]): ArrayBuffer {
  const payload = new ArrayBuffer(2 + widgets.map(getWidgetPayloadSize).reduce((a, v) => a + v))
  const payloadView = new DataView(payload)
  payloadView.setUint16(0, widgets.length)
  let offset = 2
  widgets.forEach((w) => {
    if (w.widgetType === WidgetType.Button) {
      offset += packButton(payloadView, offset, w)
    } else if (w.widgetType === WidgetType.Label) {
      offset += packLabel(payloadView, offset, w)
    } else if (w.widgetType === WidgetType.Line) {
      offset += packLine(payloadView, offset, w)
    }
  })
  return payload
}
