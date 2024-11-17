import { TextDatum, WidgetType, getWidgetsPayload, type Widget } from './widgets'

class TodoApp {
  count: number = 0
  widgets: Widget[] = [
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

  constructor() {}

  getWidgets(): Widget[] {
    return this.widgets.map((w) => (w.id === 'myLabel' ? { ...w, text: `Count ${this.count}` } : w))
  }
  reactToTouch(pressedAreaId?: string): boolean {
    if (pressedAreaId === 'myButton') {
      this.count += 1
    }
    return true
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
      let shouldUpdate = false
      widgets.forEach((w) => {
        if (w.widgetType === WidgetType.Button && x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) {
          shouldUpdate = app.reactToTouch(w.id) || shouldUpdate
        }
      })

      // TODO shouldUpdate = false shouldn't send new widgets
      const payload = getWidgetsPayload(app.getWidgets())
      console.log(`POST request: sent ${widgets.length} widgets`)
      return new Response(payload)
    }
  },
  port: '3377',
})
