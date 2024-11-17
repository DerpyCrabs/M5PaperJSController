import { TextDatum, WidgetType, getWidgetsPayload, type Widget } from './widgets'

type Task = {
  name: string
  completed?: boolean
}

class TodoApp {
  tasks: Task[] = [
    {
      name: 'buy bread',
    },
    {
      name: 'add colors',
    },
    {
      name: 'complete todo app',
    },
  ]

  constructor() {}

  renderTask(task: Task, index: number): Widget[] {
    return [
      {
        widgetType: WidgetType.Button,
        x: 0,
        y: 75 + index * 60,
        w: 540,
        h: 60,
        borderColor: 0,
        label: task.name,
        id: `task:${index}`,
      },
    ]
  }

  getWidgets(): Widget[] {
    return [
      {
        widgetType: WidgetType.Label,
        x: 540 / 2,
        y: 40,
        text: 'Todo App MVP',
        datum: TextDatum.MiddleCenter,
        fontSize: 4,
        color: 15,
      },
      ...this.tasks.flatMap(this.renderTask),
      { widgetType: WidgetType.Line, x1: 0, y1: 75, x2: 540, y2: 75, color: 15 },
    ]
  }
  reactToTouch(pressedAreaId?: string) {}
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
