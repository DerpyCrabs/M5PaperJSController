import { WidgetType, getPayload, type Widget, type PayloadInfo, composePayloadInfo, UpdateMode } from './widgets'
import { DateWidget } from './widgets/date'
import { MdTasksWidget } from './widgets/mdTasks'
import { StopwatchWidget } from './widgets/stopwatch'
import { DiskSpaceWidget } from './widgets/diskSpace'
import { CalendarWidget } from './widgets/calendar'

class DashboardApp {
  mdTasks: MdTasksWidget
  dateWidget: DateWidget
  dateWidget2: DateWidget
  stopwatchWidget: StopwatchWidget
  diskSpaceCWidget: DiskSpaceWidget
  diskSpaceDWidget: DiskSpaceWidget
  diskSpaceEWidget: DiskSpaceWidget
  calendarWidget: CalendarWidget
  currentPage: number
  constructor() {
    this.mdTasks = new MdTasksWidget('D://Notes/Notes/Tasks/Todo.md', { x: 20, y: 100, w: 440, h: 860 })
    this.dateWidget = new DateWidget('dd.MM.uuuu', { x: 0, y: 0, w: 540, h: 80 })
    this.dateWidget2 = new DateWidget('EEEE | MMMM', { x: 0, y: 80, w: 540, h: 80 })
    this.stopwatchWidget = new StopwatchWidget({ x: 90, y: 700 })
    this.diskSpaceCWidget = new DiskSpaceWidget('C', { x: 20, y: 800 })
    this.diskSpaceDWidget = new DiskSpaceWidget('D', { x: 20, y: 850 })
    this.diskSpaceEWidget = new DiskSpaceWidget('E', { x: 20, y: 900 })
    this.calendarWidget = new CalendarWidget(new Date(), { x: 20, y: 20, w: 500, h: 400 })
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
    } else if (this.currentPage === -1) {
      return {
        widgets: [...this.calendarWidget.getWidgets()],
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

  async reactToTouch(pressedAreaId?: any): Promise<PayloadInfo | void> {
    this.mdTasks.reactToTouch(pressedAreaId)
    this.stopwatchWidget.reactToTouch(pressedAreaId)
    this.calendarWidget.reactToTouch(pressedAreaId)
  }

  async reactToButton(buttonId: EventButton): Promise<PayloadInfo | void> {
    if (buttonId === EventButton.Push) {
      return composePayloadInfo([
        {
          updateMode: UpdateMode.UpdateModeGC16,
          widgets: [],
        },
        await this.getPayloadInfo(),
      ])
    } else if (buttonId === EventButton.Down && this.currentPage < 1) {
      this.currentPage += 1
    } else if (buttonId === EventButton.Up && this.currentPage > -1) {
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
      let payloadInfo: PayloadInfo | void

      if (eventType === EventType.Button) {
        const buttonId = view.getUint8(1)
        payloadInfo = await app.reactToButton(buttonId as EventButton)
        reactionCount += 1
      } else {
        const x = view.getUint16(1)
        const y = view.getUint16(3)
        payloadInfo = await Promise.all(
          sentWidgets.map(async (w) => {
            if (
              eventType === EventType.Touch &&
              w.widgetType === WidgetType.TouchArea &&
              x >= w.x &&
              x <= w.x + w.w &&
              y >= w.y &&
              y <= w.y + w.h
            ) {
              const result = await app.reactToTouch(w.id)
              if (result) {
                reactionCount += 1
                return result
              }
            }
          })
        ).then((results) => results.find((result) => result !== null))
      }

      if (!payloadInfo) {
        payloadInfo = await app.getPayloadInfo()
      }

      sentWidgets = payloadInfo.widgets
      const payload = getPayload(payloadInfo)
      console.log(`POST request: sent ${sentWidgets.length} widgets, detected press on ${reactionCount}`)
      return new Response(payload)
    }
  },
  port: '3377',
})
