import { TextDatum, type Widget } from '../widgets'
import { buttonWidget } from './button'

const keyboardLayout: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  [' ', 'bspc'],
]

export class KeyboardWidget {
  constructor(public position: { y: number }, public callback: (letter: string) => void) {}

  getWidgets(): Widget[] {
    const widgets: Widget[] = []
    let currentX = 0
    let currentY = this.position.y

    keyboardLayout.forEach((row, rowIndex) => {
      row.forEach((letter, colIndex) => {
        const buttonWidth = letter === ' ' ? 440 : letter === 'bspc' ? 100 : 54
        const buttonHeight = 60

        widgets.push(
          ...buttonWidget({
            x: currentX,
            y: currentY,
            w: buttonWidth,
            h: buttonHeight,
            label: letter,
            borderColor: 15,
            labelColor: 15,
            labelDatum: TextDatum.MiddleCenter,
            labelSize: 3,
            touchAreaId: { type: 'keyboard', letter },
          })
        )

        currentX += buttonWidth
      })

      if (rowIndex + 1 !== 4) {
        currentX = (540 - (keyboardLayout[rowIndex + 1]?.length || 0) * 54) / 2
      } else {
        currentX = 0
      }
      currentY += 60
    })

    return widgets
  }

  reactToTouch(touchAreaId?: { type: 'keyboard'; letter: string }) {
    if (touchAreaId?.type === 'keyboard') {
      this.callback(touchAreaId.letter)
    }
  }
}
