import { TextDatum, WidgetType, type LabelWidget, type RectWidget, type Widget } from '../widgets'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  subMonths,
  getWeek,
  subDays,
  isToday,
} from 'date-fns'
import { buttonWidget } from './button'

export class CalendarWidget {
  constructor(public month: Date, public position: { x: number; y: number; w: number; h: number }) {}

  getWidgets(): Widget[] {
    const startDate = startOfMonth(this.month)
    const endDate = endOfMonth(this.month)

    const widgets: Widget[] = []
    let currentDate = startDate

    // Add previous month button
    widgets.push(
      ...buttonWidget({
        x: this.position.x,
        y: this.position.y,
        w: 50,
        h: 50,
        label: '<',
        borderColor: 15,
        labelColor: 15,
        labelDatum: TextDatum.MiddleCenter,
        labelSize: 3,
        touchAreaId: { type: 'calendar', button: 'prev' },
      })
    )

    // Add month/year label
    widgets.push({
      widgetType: WidgetType.Label,
      x: this.position.x + (this.position.w - this.position.x) / 2,
      y: this.position.y + 25,
      datum: TextDatum.MiddleCenter,
      fontSize: 3,
      color: 15,
      text: format(this.month, 'MMMM yyyy'),
    })

    // Add next month button
    widgets.push(
      ...buttonWidget({
        x: this.position.x + this.position.w - 50,
        y: this.position.y,
        w: 50,
        h: 50,
        label: '>',
        borderColor: 15,
        labelColor: 15,
        labelDatum: TextDatum.MiddleCenter,
        labelSize: 3,
        touchAreaId: { type: 'calendar', button: 'next' },
      })
    )

    let currentWeek = 0
    while (currentDate.getTime() <= endDate.getTime()) {
      if (
        currentDate.getDate() !== 1 &&
        getWeek(currentDate, { weekStartsOn: 1 }) !== getWeek(subDays(currentDate, 1), { weekStartsOn: 1 })
      ) {
        currentWeek += 1
      }
      const dayOfWeek = (currentDate.getDay() + 6) % 7
      const dayOfMonth = currentDate.getDate()

      const x = this.position.x + Math.round(dayOfWeek * (this.position.w / 7))
      const y = Math.round(this.position.y + 50 + currentWeek * Math.ceil(this.position.h / 6))

      const dayLabel: LabelWidget = {
        widgetType: WidgetType.Label,
        x: x + this.position.w / 14,
        y: y + this.position.h / 12,
        datum: TextDatum.MiddleCenter,
        fontSize: 3,
        color: isToday(currentDate) ? 0 : 15,
        text: dayOfMonth.toString(),
      }

      if (isToday(currentDate)) {
        widgets.push({
          widgetType: WidgetType.Rect,
          fill: true,
          color: 15,
          x: x + 12,
          y: y + 10,
          w: Math.round(this.position.w / 7) - 28,
          h: Math.round(this.position.h / 6) - 20,
        })
      }

      widgets.push(dayLabel)

      currentDate = addDays(currentDate, 1)
    }

    return widgets
  }

  reactToTouch(touchAreaId?: { type: 'calendar'; button: 'prev' | 'next' }) {
    if (!touchAreaId || touchAreaId.type !== 'calendar') return

    if (touchAreaId.button === 'prev') {
      this.month = subMonths(this.month, 1)
    } else if (touchAreaId.button === 'next') {
      this.month = addMonths(this.month, 1)
    }
  }
}
