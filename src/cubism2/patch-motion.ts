// subclassing is impossible because it will be instantiated by `Live2DMotion.create()`
declare interface Live2DMotionCurve {
  /**
   * The id of the curve.
   */
  _$4P: string
  _$I0: number[]
  _$RP: number[]
}

declare interface Live2DMotion {
  onFinishHandler?(motion: this): void

  motions: Live2DMotionCurve[]
}

const originalUpdateParam = Live2DMotion.prototype.updateParam

Live2DMotion.prototype.updateParam = function (
  model: Live2DModelWebGL,
  entry: Live2DObfuscated.MotionQueueEnt
) {
  originalUpdateParam.call(this, model, entry)

  if (entry.isFinished() && this.onFinishHandler) {
    this.onFinishHandler(this)

    delete this.onFinishHandler
  }
}
