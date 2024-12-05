import { TextDatum, WidgetType, type LineWidget, type Widget } from '../widgets'
import fs from 'node:fs'
import path from 'node:path'
import { buttonWidget } from './button'
import { readImage } from '../utils'

const checkedIconPath = path.join(__dirname, '..', 'Assets', 'checked.bmp')
const uncheckedIconPath = path.join(__dirname, '..', 'Assets', 'unchecked.bmp')

export class MdTasksWidget {
  constructor(public filePath: string, public position: { x: number; y: number; w: number; h: number }) {}

  parseFile(): (string | { name: string; completed: boolean; level: number })[] {
    try {
      const text = fs.readFileSync(this.filePath, { encoding: 'utf-8' })
      const lines = text.split('\n')
      return lines.map((line) => {
        const taskRegex = /^(\t*)- \[([ x])\] (.+)\w*/s
        if (taskRegex.test(line)) {
          const match = taskRegex.exec(line)!
          const level = match[1].length
          const completed = match[2] === 'x'
          const taskName = match[3]
          return { name: taskName, completed, level }
        } else {
          return line
        }
      })
    } catch (e: any) {
      console.error(e)
      throw e
    }
  }

  writeTasksToFile(tasks: (string | { name: string; completed: boolean; level: number })[]) {
    try {
      const lines = tasks
        .map((t) => (typeof t === 'string' ? t : `${'\t'.repeat(t.level)}- [${t.completed ? 'x' : ' '}] ${t.name}`))
        .join('\n')
      fs.writeFileSync(this.filePath, lines)
    } catch (e: any) {
      console.error(e)
      throw e
    }
  }

  async getWidgets(): Promise<Widget[]> {
    try {
      const tasks = this.parseFile()
      const checkedIcon = await readImage(checkedIconPath)
      const uncheckedIcon = await readImage(uncheckedIconPath)
      return tasks.flatMap((task, index) => {
        if (typeof task !== 'string') {
          const offsetX = task.level * 20
          return [
            ...buttonWidget({
              x: this.position.x + offsetX,
              y: this.position.y + 15 + index * 60,
              w: 540,
              h: 60,
              label: task.name,
              borderColor: 0,
              labelColor: 15,
              labelDatum: TextDatum.MiddleLeft,
              labelSize: 3,
              labelMarginLeft: 60,
              touchAreaId: { type: 'task', lineNumber: index },
            }),
            {
              widgetType: WidgetType.Image,
              pixelData: task.completed ? checkedIcon : uncheckedIcon,
              x: this.position.x + 14 + offsetX,
              y: this.position.y + 28 + index * 60,
            },
            ...(task.completed
              ? [
                  {
                    widgetType: WidgetType.Line,
                    x1: this.position.x + 55 + offsetX,
                    x2: this.position.x + 55 + offsetX + task.name.length * 18 + 8,
                    y1: this.position.y + 45 + index * 60,
                    y2: this.position.y + 45 + index * 60,
                    color: 15,
                  } as LineWidget,
                ]
              : []),
          ]
        } else {
          return [
            {
              widgetType: WidgetType.Label,
              datum: TextDatum.MiddleLeft,
              x: this.position.x + 16,
              y: this.position.y + 45 + index * 60,
              text: task,
              fontSize: 3,
              color: 15,
            },
          ]
        }
      })
    } catch (e) {
      console.error(e)
      return [
        {
          widgetType: WidgetType.Label,
          color: 15,
          datum: TextDatum.MiddleCenter,
          fontSize: 3,
          text: 'Failed to read file',
          x: this.position.x + (this.position.w - this.position.x) / 2,
          y: this.position.y + (this.position.h - this.position.y) / 2,
        },
      ]
    }
  }

  reactToTouch(touchAreaId?: { type: 'task'; lineNumber: number }) {
    if (!touchAreaId) return
    const tasks = this.parseFile()
    if (touchAreaId.type === 'task' && typeof tasks[touchAreaId.lineNumber] !== 'string') {
      this.writeTasksToFile(
        tasks.map((t, i) => (i === touchAreaId.lineNumber ? { ...(t as any), completed: !(t as any).completed } : t))
      )
    }
  }
}
