import { WidgetType, getPayload, type Widget, type PayloadInfo } from './widgets'
import { MdTasksWidget } from './mdTasks'

class DashboardApp {
  mdTasks: MdTasksWidget
  constructor() {
    this.mdTasks = new MdTasksWidget('D://Notes/Notes/Tasks/Todo.md', { x: 100, y: 100, w: 440, h: 860 })
  }

  getPayloadInfo(): PayloadInfo {
    return {
      widgets: this.mdTasks.getWidgets(),
    }
  }

  reactToTouch(pressedAreaId?: any) {
    this.mdTasks.reactToTouch(pressedAreaId)
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
