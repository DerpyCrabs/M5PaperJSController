import { WidgetType, getPayload, type Widget, type PayloadInfo, composePayloadInfo } from './widgets'
import { DateWidget } from './widgets/date'
import { MdTasksWidget } from './widgets/mdTasks'
import { StopwatchWidget } from './widgets/stopwatch'

class DashboardApp {
  mdTasks: MdTasksWidget
  dateWidget: DateWidget
  dateWidget2: DateWidget
  stopwatchWidget: StopwatchWidget
  constructor() {
    this.mdTasks = new MdTasksWidget('D://Notes/Notes/Tasks/Todo.md', { x: 100, y: 100, w: 440, h: 860 })
    this.dateWidget = new DateWidget('dd.MM.uuuu', { x: 0, y: 0, w: 540, h: 80 })
    this.dateWidget2 = new DateWidget('EEEE | MMMM', { x: 0, y: 80, w: 540, h: 80 })
    this.stopwatchWidget = new StopwatchWidget({ x: 90, y: 700 })
  }

  getPayloadInfo(): PayloadInfo {
    return composePayloadInfo([
      {
        updateTimer: 300,
        widgets: [...this.mdTasks.getWidgets(), ...this.dateWidget.getWidgets(), ...this.dateWidget2.getWidgets()],
      },
      this.stopwatchWidget.getPayloadInfo(),
    ])
  }

  reactToTouch(pressedAreaId?: any) {
    this.mdTasks.reactToTouch(pressedAreaId)
    this.stopwatchWidget.reactToTouch(pressedAreaId)
  }

  reactToButton(buttonId: EventButton) {}
}

const app = new DashboardApp()

export enum EventType {
  Touch = 1,
  Button = 2,
}

export enum EventButton {
  Up = 0,
  Push = 1,
  Down = 2,
}

let sentWidgets: Widget[] = []
Bun.serve({
  async fetch(req) {
    if (req.method === 'GET') {
      const payloadInfo = app.getPayloadInfo()
      sentWidgets = payloadInfo.widgets
      const payload = getPayload(payloadInfo)
      console.log(`GET request: sent ${sentWidgets.length} widgets`)
      return new Response(payload)
    } else {
      const body = await req.arrayBuffer()
      const view = new DataView(body)
      const eventType = view.getUint8(0)
      let reactionCount = 0

      if (eventType === EventType.Button) {
        const buttonId = view.getUint8(1)
        app.reactToButton(buttonId as EventButton)
        reactionCount += 1
      } else {
        const x = view.getUint16(1)
        const y = view.getUint16(3)
        sentWidgets.forEach((w) => {
          if (
            eventType === EventType.Touch &&
            w.widgetType === WidgetType.TouchArea &&
            x >= w.x &&
            x <= w.x + w.w &&
            y >= w.y &&
            y <= w.y + w.h
          ) {
            app.reactToTouch(w.id)
            reactionCount += 1
          }
        })
      }

      const payloadInfo = app.getPayloadInfo()
      sentWidgets = payloadInfo.widgets
      const payload = getPayload(payloadInfo)
      console.log(`POST request: sent ${sentWidgets.length} widgets, detected press on ${reactionCount}`)
      return new Response(payload)
    }
  },
  port: '3377',
})
