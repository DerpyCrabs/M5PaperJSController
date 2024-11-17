enum WidgetType {
  Button = 1,
  Label = 2,
  Line = 3,
}

enum TextDatum {
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
type Button = {
  widgetType: WidgetType.Button
  x: number
  y: number
  w: number
  h: number
  id?: string
}

// Label structure
// x: uint16
// y: uint16
// textDatum: uint8
// fontSize: uint8
// textLength: uint8
// ...text: textLength bits
type Label = {
  widgetType: WidgetType.Label
  x: number
  y: number
  datum: TextDatum
  fontSize: number
  text: string
  id?: string
}

// Line structure
// x1: uint16
// y1: uint16
// x2: uint16
// y2: uint16
type Line = {
  widgetType: WidgetType.Line
  x1: number
  y1: number
  x2: number
  y2: number
  id?: string
}

type Widget = Button | Label | Line

function packButton(view: DataView, offset: number, button: Button): number {
  view.setUint8(offset, WidgetType.Button)
  view.setUint16(offset + 1, button.x)
  view.setUint16(offset + 3, button.y)
  view.setUint16(offset + 5, button.w)
  view.setUint16(offset + 7, button.h)
  return getWidgetPayloadSize(button)
}

function packLabel(view: DataView, offset: number, label: Label): number {
  view.setUint8(offset, WidgetType.Label)
  view.setUint16(offset + 1, label.x)
  view.setUint16(offset + 3, label.y)
  view.setUint8(offset + 5, label.datum)
  view.setUint8(offset + 6, label.fontSize)
  view.setUint8(offset + 7, label.text.length + 1)
  let currentOffset = offset + 8
  label.text.split('').forEach((char) => {
    view.setUint8(currentOffset, char.charCodeAt(0))
    currentOffset += 1
  })
  view.setUint8(currentOffset, 0)
  return getWidgetPayloadSize(label)
}

function packLine(view: DataView, offset: number, line: Line): number {
  view.setUint8(offset, WidgetType.Line)
  view.setUint16(offset + 1, line.x1)
  view.setUint16(offset + 3, line.y1)
  view.setUint16(offset + 5, line.x2)
  view.setUint16(offset + 7, line.y2)
  return getWidgetPayloadSize(line)
}

function getWidgetPayloadSize(widget: Widget): number {
  if (widget.widgetType === WidgetType.Button) {
    return 9
  } else if (widget.widgetType === WidgetType.Label) {
    return 8 + widget.text.length + 1
  } else if (widget.widgetType === WidgetType.Line) {
    return 9
  } else {
    throw new Error(`Unsupported widget type ${(widget as any).widgetType}`)
  }
}

function getWidgetsPayload(widgets: Widget[]): ArrayBuffer {
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

const widgets: Widget[] = [
  { widgetType: WidgetType.Button, id: 'myButton', x: 100, y: 200, w: 300, h: 150 },
  {
    widgetType: WidgetType.Label,
    id: 'myLabel',
    x: 250,
    y: 275,
    datum: TextDatum.MiddleCenter,
    fontSize: 3,
    text: 'Test button',
  },
  { widgetType: WidgetType.Line, x1: 0, y1: 500, x2: 540, y2: 500 },
]

let count = 0
Bun.serve({
  async fetch(req) {
    if (req.method === 'GET') {
      const payload = getWidgetsPayload(widgets)
      console.log('sent', payload)
      return new Response(payload)
    } else {
      const body = await req.text()
      const parts = body.slice(0, -1).split(',')
      const x = Number(parts[0])
      const y = Number(parts[1])

      widgets.forEach((w) => {
        if (w.widgetType === WidgetType.Button && x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) {
          console.log(`Pressed ${w.widgetType}: ${w.id ? w.id : `at ${w.x} ${w.y} ${w.w} ${w.h}`}`)
        }
      })

      const payload = getWidgetsPayload(
        widgets.map((w) => (w.id === 'myLabel' ? { ...w, text: `Count ${++count}` } : w))
      )
      console.log('sent', payload)
      return new Response(payload)
    }
  },
  port: '3377',
})
