import { TextDatum, WidgetType, getWidgetsPayload, type Widget } from './widgets'

class TodoApp {
  count: number = 0

  constructor() {}

  getWidgets(): Widget[] {
    return [
      { widgetType: WidgetType.Button, id: 'myButton', x: 100, y: 200, w: 300, h: 150 },
      {
        widgetType: WidgetType.Label,
        id: 'myLabel',
        x: 250,
        y: 275,
        datum: TextDatum.MiddleCenter,
        fontSize: 3,
        text: `Count ${this.count}`,
      },
      { widgetType: WidgetType.Line, x1: 0, y1: 500, x2: 540, y2: 500 },
    ]
  }
  reactToTouch(pressedAreaId?: string) {
    if (pressedAreaId === 'myButton') {
      this.count += 1
    }
  }
}

const app = new TodoApp()

Bun.serve({
  async fetch(req) {
    if (req.method === 'GET') {
      const widgets = app.getWidgets()
      const payload = getWidgetsPayload(widgets)
      console.log(`GET request: sent ${widgets.length} widgets`)
      return new Response(payload)
    } else {
      const body = await req.text()
      const parts = body.slice(0, -1).split(',')
      const [x, y] = [Number(parts[0]), Number(parts[1])]

      const widgets = app.getWidgets()
      let reactionCount = 0
      widgets.forEach((w) => {
        if (w.widgetType === WidgetType.Button && x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) {
          app.reactToTouch(w.id)
          reactionCount += 1
        }
      })

      const payload = getWidgetsPayload(app.getWidgets())
      console.log(`POST request: sent ${widgets.length} widgets, detected press on ${reactionCount}`)
      return new Response(payload)
    }
  },
  port: '3377',
})
