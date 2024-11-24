import { TextDatum, WidgetType, type PayloadInfo } from '../widgets'
import { buttonWidget } from './button'

export class StopwatchWidget {
  isCounting = false
  timeInSeconds = 0
  timer: Timer | null = null

  constructor(public position: { x: number; y: number }) {}
  getPayloadInfo(): PayloadInfo {
    return {
      updateTimer: this.isCounting ? 1 : undefined,
      widgets: [
        ...buttonWidget({
          x: this.position.x,
          y: this.position.y,
          w: 120,
          h: 40,
          label: 'Reset',
          borderColor: 15,
          labelColor: 15,
          labelDatum: TextDatum.MiddleCenter,
          labelSize: 3,
          touchAreaId: { type: 'stopwatch', button: 'reset' },
        }),
        {
          widgetType: WidgetType.Label,
          datum: TextDatum.MiddleCenter,
          x: this.position.x + 180,
          y: this.position.y + 20,
          text: `${Math.floor(this.timeInSeconds / 60)
            .toString()
            .padStart(2, '0')}:${(this.timeInSeconds % 60).toString().padStart(2, '0')}`,
          fontSize: 3,
          color: 15,
        },
        ...buttonWidget({
          x: this.position.x + 240,
          y: this.position.y,
          w: 120,
          h: 40,
          label: this.isCounting ? 'Pause' : 'Start',
          borderColor: 15,
          labelColor: 15,
          labelDatum: TextDatum.MiddleCenter,
          labelSize: 3,
          touchAreaId: { type: 'stopwatch', button: 'start/pause' },
        }),
      ],
    }
  }

  reactToTouch(touchAreaId?: { type: 'stopwatch'; button: 'reset' | 'start/pause' }) {
    if (!touchAreaId || touchAreaId.type !== 'stopwatch') return

    if (touchAreaId.button === 'reset') {
      this.isCounting = false
      this.timeInSeconds = 0
      if (this.timer !== null) {
        clearInterval(this.timer)
        this.timer = null
      }
    } else {
      this.isCounting = !this.isCounting
      if (this.isCounting) {
        this.timer = setInterval(() => {
          this.timeInSeconds += 1
        }, 1000)
      } else if (this.timer !== null) {
        clearInterval(this.timer)
        this.timer = null
      }
    }
  }
}
