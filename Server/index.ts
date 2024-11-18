import { TextDatum, WidgetType, getWidgetsPayload, type ImageWidget, type LineWidget, type Widget } from './widgets'
import bmp from 'bmp-js'
import fs from 'node:fs'
import path from 'node:path'

const checkedIcon = bmp.decode(fs.readFileSync(path.join(__dirname, 'Assets', 'checked.bmp')))
const uncheckedIcon = bmp.decode(fs.readFileSync(path.join(__dirname, 'Assets', 'unchecked.bmp')))

function bmpToPixelData(bmp: bmp.BmpDecoder): ImageWidget['pixelData'] {
  const w = bmp.width
  const h = bmp.height
  const data: ImageWidget['pixelData'] = { rows: [...Array(h)].map(() => ({ pixels: [...Array(w).fill(0)] })) }

  data.rows.forEach((row, i) => {
    row.pixels.forEach((pixel, j) => {
      const r = bmp.data[i * 4 * h + j * 4 + 1]
      data.rows[i].pixels[j] = r !== 0 ? 0 : 1
    })
  })

  return data
}

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
        labelMarginLeft: 60,
        labelDatum: TextDatum.MiddleLeft,
        id: `task:${index}`,
      },
      {
        widgetType: WidgetType.Image,
        x: 14,
        y: 88 + index * 60,
        w: 32,
        h: 32,
        color: 15,
        pixelData: bmpToPixelData(task.completed ? checkedIcon : uncheckedIcon),
      },
      ...(task.completed
        ? [
            {
              widgetType: WidgetType.Line,
              x1: 55,
              x2: 55 + task.name.length * 18 + 8,
              y1: 105 + index * 60,
              y2: 105 + index * 60,
              color: 15,
            } as LineWidget,
          ]
        : []),
    ]
  }

  getWidgets(): Widget[] {
    return [
      {
        widgetType: WidgetType.Rect,
        x: 118,
        y: 18,
        w: 300,
        h: 40,
        roundRadius: 6,
        color: 15,
        fill: true,
      },
      {
        widgetType: WidgetType.Label,
        x: 540 / 2,
        y: 40,
        text: 'Todo App MVP',
        datum: TextDatum.MiddleCenter,
        fontSize: 4,
        color: 0,
      },
      ...this.tasks.flatMap(this.renderTask),
      { widgetType: WidgetType.Line, x1: 0, y1: 75, x2: 540, y2: 75, color: 15 },
      {
        widgetType: WidgetType.BatteryStatus,
        x: 540 - 30,
        y: 20,
        fontSize: 2,
        color: 15,
      },
    ]
  }

  reactToTouch(pressedAreaId?: string) {
    if (pressedAreaId && /task:.*/g.test(pressedAreaId)) {
      const taskIndex = Number(pressedAreaId.split(':')[1])
      this.tasks[taskIndex].completed = !(this.tasks[taskIndex].completed || false)
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
