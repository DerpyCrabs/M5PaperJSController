import { TextDatum, WidgetType, type ImageWidget, type LineWidget, type Widget } from '../widgets'
import fs from 'node:fs'
import path from 'node:path'
import { buttonWidget } from './button'
import { readBmpIcon } from '../utils'

const checkedIcon = readBmpIcon(path.join(__dirname, '..', 'Assets', 'checked.bmp'))
const uncheckedIcon = readBmpIcon(path.join(__dirname, '..', 'Assets', 'unchecked.bmp'))

export class MdTasksWidget {
  constructor(public filePath: string, public position: { x: number; y: number; w: number; h: number }) {}

  parseFile(): (string | { name: string; completed: boolean })[] {
    try {
      const text = fs.readFileSync(this.filePath, { encoding: 'utf-8' })
      const lines = text.split('\n')
      return lines.map((line) => {
        const taskRegex = /^\w*- \[([ x])\] (.+)\w*/s
        if (taskRegex.test(line)) {
          const match = taskRegex.exec(line)!
          const completed = match[1] === 'x'
          const taskName = match[2]
          return { name: taskName, completed }
        } else {
          return line
        }
      })
    } catch (e: any) {
      console.error(e)
      throw e
    }
  }

  writeTasksToFile(tasks: (string | { name: string; completed: boolean })[]) {
    try {
      const lines = tasks
        .map((t) => (typeof t === 'string' ? t : `- [${t.completed ? 'x' : ' '}] ${t.name}`))
        .join('\n')
      fs.writeFileSync(this.filePath, lines)
    } catch (e: any) {
      console.error(e)
      throw e
    }
  }

  getWidgets(): Widget[] {
    try {
      const tasks = this.parseFile()
      return tasks.flatMap((task, index) => {
        if (typeof task !== 'string') {
          return [
            ...buttonWidget({
              x: this.position.x,
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
              x: this.position.x + 14,
              y: this.position.y + 28 + index * 60,
              w: 32,
              h: 32,
              color: 15,
              pixelData: task.completed ? checkedIcon : uncheckedIcon,
            },
            ...(task.completed
              ? [
                  {
                    widgetType: WidgetType.Line,
                    x1: this.position.x + 55,
                    x2: this.position.x + 55 + task.name.length * 18 + 8,
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
              w: 540,
              h: 60,
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
