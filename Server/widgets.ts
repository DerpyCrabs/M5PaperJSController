export enum PrimitiveWidgetType {
  Rect = 1,
  Label = 2,
  Line = 3,
  Image = 4,
}

export enum WidgetType {
  Rect = 'Rect',
  Label = 'Label',
  Line = 'Line',
  Button = 'Button',
  Image = 'Image',
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
export type RectWidget = {
  widgetType: WidgetType.Rect
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

export type PrimitiveWidget = LabelWidget | LineWidget | RectWidget | ImageWidget
export type CompositeWidget = ButtonWidget
export type Widget = CompositeWidget | PrimitiveWidget

function packRect(view: DataView, offset: number, rect: RectWidget): number {
  view.setUint8(offset, PrimitiveWidgetType.Rect)
  view.setUint16(offset + 1, rect.x)
  view.setUint16(offset + 3, rect.y)
  view.setUint16(offset + 5, rect.w)
  view.setUint16(offset + 7, rect.h)
  view.setUint8(offset + 9, rect.color)
  return getWidgetPayloadSize(rect)
}

function packLabel(view: DataView, offset: number, label: LabelWidget): number {
  view.setUint8(offset, PrimitiveWidgetType.Label)
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
  view.setUint8(offset, PrimitiveWidgetType.Line)
  view.setUint16(offset + 1, line.x1)
  view.setUint16(offset + 3, line.y1)
  view.setUint16(offset + 5, line.x2)
  view.setUint16(offset + 7, line.y2)
  view.setUint8(offset + 9, line.color)
  return getWidgetPayloadSize(line)
}

function packImage(view: DataView, offset: number, image: ImageWidget): number {
  view.setUint8(offset, PrimitiveWidgetType.Image)
  view.setUint16(offset + 1, image.x)
  view.setUint16(offset + 3, image.y)
  view.setUint16(offset + 5, image.w)
  view.setUint16(offset + 7, image.h)
  view.setUint8(offset + 9, image.color)
  let currentOffset = offset + 10
  image.pixelData.rows.forEach((row) => {
    row.pixels.forEach((pixel) => {
      view.setUint8(currentOffset, pixel)
      currentOffset += 1
    })
  })
  return getWidgetPayloadSize(image)
}

function getWidgetPayloadSize(widget: PrimitiveWidget): number {
  if (widget.widgetType === WidgetType.Rect) {
    return 10
  } else if (widget.widgetType === WidgetType.Label) {
    return 9 + widget.text.length + 1
  } else if (widget.widgetType === WidgetType.Line) {
    return 10
  } else if (widget.widgetType === WidgetType.Image) {
    return 10 + widget.w * widget.h
  } else {
    throw new Error(`Unsupported widget type ${(widget as any).widgetType}`)
  }
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

export function getWidgetsPayload(widgets: Widget[]): ArrayBuffer {
  const primitiveWidgets = unwrapCompositeWidgets(widgets)
  const payload = new ArrayBuffer(2 + primitiveWidgets.map(getWidgetPayloadSize).reduce((a, v) => a + v))
  const payloadView = new DataView(payload)
  let offset = 0
  payloadView.setUint16(0, primitiveWidgets.length)
  offset += 2
  primitiveWidgets.forEach((w) => {
    if (w.widgetType === WidgetType.Rect) {
      offset += packRect(payloadView, offset, w)
    } else if (w.widgetType === WidgetType.Label) {
      offset += packLabel(payloadView, offset, w)
    } else if (w.widgetType === WidgetType.Line) {
      offset += packLine(payloadView, offset, w)
    } else if (w.widgetType === WidgetType.Image) {
      offset += packImage(payloadView, offset, w)
    }
  })
  return payload
}
