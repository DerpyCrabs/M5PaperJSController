import { TextDatum, WidgetType, type LabelWidget, type PayloadInfo, type Widget } from '../widgets'
import checkDiskSpace from 'check-disk-space'

export class DiskSpaceWidget {
  constructor(public diskLetter: string, public position: { x: number; y: number }) {}

  async getPayloadInfo(): Promise<PayloadInfo> {
    const diskSpace = await checkDiskSpace(`${this.diskLetter}:\\`)
    return {
      widgets: [
        {
          widgetType: WidgetType.Label,
          color: 15,
          datum: TextDatum.MiddleLeft,
          fontSize: 3,
          text: `${this.diskLetter} Drive: ${Math.round((diskSpace.free / 1000 / 1000 / 1000) * 10) / 10}/${
            Math.round((diskSpace.size / 1000 / 1000 / 1000) * 10) / 10
          } GB`,
          x: this.position.x,
          y: this.position.y,
        },
      ],
    }
  }
}
