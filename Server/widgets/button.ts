import {
  TextDatum,
  WidgetType,
  type Color,
  type LabelWidget,
  type RectWidget,
  type TouchAreaWidget,
  type Widget,
} from '../widgets'

export function buttonWidget({
  x,
  y,
  w,
  h,
  label,
  borderColor,
  labelColor,
  labelDatum,
  labelSize,
  labelMarginLeft,
  touchAreaId,
}: {
  x: number
  y: number
  w: number
  h: number
  label?: string
  borderColor?: Color
  labelColor?: Color
  labelDatum?: TextDatum
  labelSize?: number
  labelMarginLeft?: number
  touchAreaId?: any
}): Widget[] {
  const border: RectWidget = {
    color: borderColor !== undefined ? borderColor : 15,
    x: x,
    y: y,
    w: w,
    h: h,
    widgetType: WidgetType.Rect,
  }
  const labelWidget: LabelWidget[] = label
    ? [
        {
          widgetType: WidgetType.Label,
          datum: labelDatum || TextDatum.MiddleCenter,
          x: x + (labelMarginLeft !== undefined ? labelMarginLeft : w / 2),
          y: y + h / 2,
          text: label,
          color: labelColor !== undefined ? labelColor : 15,
          fontSize: labelSize || 3,
        },
      ]
    : []
  const touchArea: TouchAreaWidget[] = touchAreaId
    ? [
        {
          widgetType: WidgetType.TouchArea,
          x,
          y,
          w,
          h,
          id: touchAreaId,
        },
      ]
    : []
  return [border, ...labelWidget, ...touchArea]
}
