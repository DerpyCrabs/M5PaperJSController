import { WidgetType, getPayload, type Widget, type PayloadInfo, composePayloadInfo } from './widgets'
import { DateWidget } from './widgets/date'
import { MdTasksWidget } from './widgets/mdTasks'
import { StopwatchWidget } from './widgets/stopwatch'
import { DiskSpaceWidget } from './widgets/diskSpace'

class DashboardApp {
  mdTasks: MdTasksWidget
  dateWidget: DateWidget
  dateWidget2: DateWidget
  stopwatchWidget: StopwatchWidget
  diskSpaceCWidget: DiskSpaceWidget
  diskSpaceDWidget: DiskSpaceWidget
  diskSpaceEWidget: DiskSpaceWidget
  currentPage: number
  constructor() {
    this.mdTasks = new MdTasksWidget('D://Notes/Notes/Tasks/Todo.md', { x: 30, y: 100, w: 440, h: 860 })
    this.dateWidget = new DateWidget('dd.MM.uuuu', { x: 0, y: 0, w: 540, h: 80 })
    this.dateWidget2 = new DateWidget('EEEE | MMMM', { x: 0, y: 80, w: 540, h: 80 })
    this.stopwatchWidget = new StopwatchWidget({ x: 90, y: 700 })
    this.diskSpaceCWidget = new DiskSpaceWidget('C', { x: 20, y: 800 })
    this.diskSpaceDWidget = new DiskSpaceWidget('D', { x: 20, y: 850 })
    this.diskSpaceEWidget = new DiskSpaceWidget('E', { x: 20, y: 900 })
    this.currentPage = 0
  }

  async getPayloadInfo(): Promise<PayloadInfo> {
    if (this.currentPage === 0) {
      return {
        updateTimer: 300,
        widgets: [
          ...(await this.mdTasks.getWidgets()),
          ...this.dateWidget.getWidgets(),
          ...this.dateWidget2.getWidgets(),
        ],
      }
    } else {
      return composePayloadInfo([
        this.stopwatchWidget.getPayloadInfo(),
        await this.diskSpaceCWidget.getPayloadInfo(),
        await this.diskSpaceDWidget.getPayloadInfo(),
        await this.diskSpaceEWidget.getPayloadInfo(),
      ])
    }
  }

  reactToTouch(pressedAreaId?: any) {
    this.mdTasks.reactToTouch(pressedAreaId)
    this.stopwatchWidget.reactToTouch(pressedAreaId)
  }

  reactToButton(buttonId: EventButton) {
    if (buttonId === EventButton.Down && this.currentPage < 1) {
      this.currentPage += 1
    } else if (buttonId === EventButton.Up && this.currentPage > 0) {
      this.currentPage -= 1
    }
  }
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
      const payloadInfo = await app.getPayloadInfo()
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

      const payloadInfo = await app.getPayloadInfo()
      sentWidgets = payloadInfo.widgets
      const payload = getPayload(payloadInfo)
      console.log(`POST request: sent ${sentWidgets.length} widgets, detected press on ${reactionCount}`)
      return new Response(payload)
    }
  },
  port: '3377',
})
