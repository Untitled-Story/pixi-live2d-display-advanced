import * as PIXI from 'pixi.js'
import { Live2DModel } from '../src'

const applicationWrapper = document.getElementById('app')! as HTMLDivElement

const pixiApplication = new PIXI.Application({
  background: 0xffffff,
  resizeTo: applicationWrapper,
  autoDensity: true,
  antialias: true,
  resolution: window.devicePixelRatio || 1
})
applicationWrapper.appendChild(pixiApplication.view as HTMLCanvasElement)

pixiApplication.stage.sortableChildren = true

const model = await Live2DModel.from(
  'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json',
  {
    ticker: PIXI.Ticker.shared,
    autoFocus: false,
    autoHitTest: false,
    breathDepth: 0.2
  }
)
model.internalModel.extendParallelMotionManager(2)

pixiApplication.stage.addChild(model)
model.scale.set(0.2)
model.x = pixiApplication.screen.width / 2
model.y = pixiApplication.screen.height / 1.6
model.anchor.set(0.5)
