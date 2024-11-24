import { format } from 'date-fns'
import { TextDatum, WidgetType, type Widget } from '../widgets'

export class DateWidget {
  constructor(public format: string, public position: { x: number; y: number; w: number; h: number }) {}

  getWidgets(): Widget[] {
    return [
      {
        widgetType: WidgetType.Label,
        color: 15,
        datum: TextDatum.MiddleCenter,
        fontSize: 3,
        text: format(new Date(), this.format),
        x: this.position.x + (this.position.w - this.position.x) / 2,
        y: this.position.y + (this.position.h - this.position.y) / 2,
      },
    ]
  }
}
