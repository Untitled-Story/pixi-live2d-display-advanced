// noinspection JSUnusedGlobalSymbols

import type { Live2DModel } from '@/Live2DModel'
import type { Renderer } from 'pixi.js'
import { type FederatedPointerEvent, Graphics, Rectangle, Text, TextStyle } from 'pixi.js'

const tempBounds = new Rectangle()

export class HitAreaFrames extends Graphics {
  initialized = false

  texts: Text[] = []

  strokeWidth = 4
  normalColor = 0xe31a1a
  activeColor = 0x1ec832

  constructor() {
    super()

    this.eventMode = 'static'

    this.on('added', this.handleInit).on('globalpointermove', this.handlePointerMove)
  }

  private readonly handleInit = () => {
    const internalModel = (this.parent as Live2DModel).internalModel

    const textStyle = new TextStyle({
      fontSize: 24,
      fill: '#ffffff',
      stroke: { color: '#000000', width: 4 }
    })

    this.texts = Object.keys(internalModel.hitAreas).map((hitAreaName) => {
      const text = new Text({
        text: hitAreaName,
        style: textStyle
      })

      text.visible = false

      this.addChild(text)

      return text
    })
  }

  private readonly handlePointerMove = (e: FederatedPointerEvent) => {
    const hitAreaNames = (this.parent as Live2DModel).hitTest(e.global.x, e.global.y)

    this.texts.forEach((text) => {
      text.visible = hitAreaNames.includes(text.text)
    })
  }

  protected _render(renderer: Renderer): void {
    const internalModel = (this.parent as Live2DModel).internalModel

    // extract scale from the transform matrix, and invert it to ease following calculation
    // https://math.stackexchange.com/a/13165
    const matrix = this.worldTransform
    const scale = 1 / Math.sqrt(matrix.a ** 2 + matrix.b ** 2)

    this.texts.forEach((text) => {
      const hitArea = internalModel.hitAreas[text.text]

      if (!hitArea) {
        return
      }

      let drawIndex = hitArea.index

      if (drawIndex < 0) {
        drawIndex = internalModel.getDrawableIndex(hitArea.id)

        if (drawIndex < 0) {
          return
        }

        hitArea.index = drawIndex
      }

      const bounds = internalModel.getDrawableBounds(drawIndex, tempBounds)
      const transform = internalModel.localTransform

      bounds.x = bounds.x * transform.a + transform.tx
      bounds.y = bounds.y * transform.d + transform.ty
      bounds.width = bounds.width * transform.a
      bounds.height = bounds.height * transform.d

      this.setStrokeStyle({
        width: this.strokeWidth * scale,
        color: text.visible ? this.activeColor : this.normalColor
      }).rect(bounds.x, bounds.y, bounds.width, bounds.height)

      text.x = bounds.x + this.strokeWidth * scale
      text.y = bounds.y + this.strokeWidth * scale
      text.scale.set(scale)
    })

    const render = (
      Graphics.prototype as unknown as {
        _render: (renderer: Renderer) => void
      }
    )._render
    render.call(this, renderer)

    this.clear()
  }
}
