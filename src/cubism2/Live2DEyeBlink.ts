import { clamp, rand } from '@/utils'

const enum EyeState {
  Idle,
  Closing,
  Closed,
  Opening
}

export class Live2DEyeBlink {
  leftParam: number
  rightParam: number

  blinkInterval = 4000
  closingDuration = 100
  closedDuration = 50
  openingDuration = 150

  eyeState = EyeState.Idle
  eyeParamValue = 1
  timer = 0
  nextBlinkTime = this.blinkInterval + rand(0, 2000)

  constructor(readonly coreModel: Live2DModelWebGL) {
    this.leftParam = coreModel.getParamIndex('PARAM_EYE_L_OPEN')
    this.rightParam = coreModel.getParamIndex('PARAM_EYE_R_OPEN')
  }

  setEyeParams(value: number) {
    this.eyeParamValue = clamp(value, 0, 1)
    this.coreModel.setParamFloat(this.leftParam, this.eyeParamValue)
    this.coreModel.setParamFloat(this.rightParam, this.eyeParamValue)
  }

  update(dt: DOMHighResTimeStamp) {
    switch (this.eyeState) {
      case EyeState.Idle:
        this.timer += dt
        if (this.timer >= this.nextBlinkTime) {
          this.timer = 0
          this.eyeState = EyeState.Closing
        }
        break

      case EyeState.Closing:
        this.setEyeParams(this.eyeParamValue - dt / this.closingDuration)
        if (this.eyeParamValue <= 0) {
          this.eyeState = EyeState.Closed
          this.timer = 0
        }
        break

      case EyeState.Closed:
        this.timer += dt
        if (this.timer >= this.closedDuration) {
          this.eyeState = EyeState.Opening
        }
        break

      case EyeState.Opening:
        this.setEyeParams(this.eyeParamValue + dt / this.openingDuration)
        if (this.eyeParamValue >= 1) {
          this.eyeState = EyeState.Idle
          this.timer = 0
          this.nextBlinkTime = this.blinkInterval + rand(0, 2000)
        }
        break
    }
  }
}
