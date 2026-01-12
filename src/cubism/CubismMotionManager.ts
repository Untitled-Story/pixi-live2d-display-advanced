// noinspection DuplicatedCode

import { config } from '@/config'
import type { MotionManagerOptions } from '@/cubism-common/MotionManager'
import { MotionManager } from '@/cubism-common/MotionManager'
import { CubismExpressionManager } from '@/cubism/CubismExpressionManager'
import type { CubismModelSettings } from '@/cubism/CubismModelSettings'
import type * as CubismSpec from '@cubism/CubismSpec'
import type { CubismModel } from '@cubism/model/cubismmodel'
import type { ACubismMotion } from '@cubism/motion/acubismmotion'
import { CubismMotion } from '@cubism/motion/cubismmotion'
import { CubismMotionJson } from '@cubism/motion/cubismmotionjson'
import { CubismMotionQueueManager } from '@cubism/motion/cubismmotionqueuemanager'
import type { Mutable } from '@/types/helpers'
import { motionSkipToLastFrame } from '@/cubism/MotionSkipLastFrameHelper'
import type { CubismInternalModel } from '@/cubism/CubismInternalModel'
import { csmVector } from '@cubism/type/csmvector'
import { CubismFramework } from '@cubism/live2dcubismframework'
import type { CubismIdHandle } from '@cubism/id/cubismid'

export class CubismMotionManager extends MotionManager<CubismMotion, CubismSpec.Motion> {
  readonly definitions: Partial<Record<string, CubismSpec.Motion[]>>

  readonly groups = { idle: 'Idle' } as const

  readonly motionDataType = 'arraybuffer'

  readonly queueManager = new CubismMotionQueueManager()

  declare readonly settings: CubismModelSettings

  expressionManager?: CubismExpressionManager

  eyeBlinkIds: string[]
  lipSyncIds = ['ParamMouthOpenY']

  constructor(parent: CubismInternalModel) {
    super(parent)

    this.definitions = parent.settings.motions ?? {}
    this.eyeBlinkIds = parent.settings.getEyeBlinkParameters() || []

    const lipSyncIds = parent.settings.getLipSyncParameters()

    if (lipSyncIds?.length) {
      this.lipSyncIds = lipSyncIds
    }
    this.init(parent.options)
  }

  protected init(options?: MotionManagerOptions) {
    super.init(options)

    if (this.settings.expressions) {
      this.expressionManager = new CubismExpressionManager(this.settings, options)
    }

    this.queueManager.setEventCallback(
      (_caller: unknown, eventValue: string | number | undefined, _customData: unknown) => {
        this.emit('motion:' + String(eventValue))
      }
    )
  }

  isFinished(): boolean {
    return this.queueManager.isFinished()
  }

  protected _startMotion(
    motion: CubismMotion,
    onFinish?: (motion: CubismMotion) => void,
    ignoreParamIds?: string[]
  ): number {
    motion.setFinishedMotionHandler(onFinish as (motion: ACubismMotion) => void)

    if (ignoreParamIds && ignoreParamIds.length > 0) {
      motion._motionData.curves = motion._motionData.curves.filter((item: { id?: string }) => {
        return item.id ? !ignoreParamIds.includes(item.id) : true
      })
      motion._motionData.curveCount = motion._motionData.curves.length
    }

    this.queueManager.stopAllMotions()

    return this.queueManager.startMotion(motion, false)
  }

  protected _stopAllMotions(): void {
    this.queueManager.stopAllMotions()
  }

  createMotion(data: ArrayBuffer, group: string, definition: CubismSpec.Motion): CubismMotion {
    const shouldCheckMotionConsistency = !!this.parent.options.checkMotionConsistency
    const motion = CubismMotion.create(
      data,
      data.byteLength,
      undefined,
      undefined,
      shouldCheckMotionConsistency
    )
    const json = new CubismMotionJson(data, data.byteLength)

    const defaultFadingDuration =
      (group === this.groups.idle ? config.idleMotionFadingDuration : config.motionFadingDuration) /
      1000

    // fading duration priorities: model.json > motion.json > config (default)

    // overwrite the fading duration only when it's not defined in the motion JSON
    if (json.getMotionFadeInTime() === undefined) {
      motion.setFadeInTime(
        definition.FadeInTime! > 0 ? definition.FadeInTime! : defaultFadingDuration
      )
    }

    if (json.getMotionFadeOutTime() === undefined) {
      motion.setFadeOutTime(
        definition.FadeOutTime! > 0 ? definition.FadeOutTime! : defaultFadingDuration
      )
    }

    motion.setEffectIds(
      this.createIdVector(this.eyeBlinkIds),
      this.createIdVector(this.lipSyncIds)
    )

    return motion
  }

  getMotionFile(definition: CubismSpec.Motion): string {
    return definition.File
  }

  protected getMotionName(definition: CubismSpec.Motion): string {
    return definition.File
  }

  protected getSoundFile(definition: CubismSpec.Motion): string | undefined {
    return definition.Sound
  }

  protected updateParameters(model: CubismModel, now: DOMHighResTimeStamp): boolean {
    return this.queueManager.doUpdateMotion(model, now)
  }

  destroy() {
    super.destroy()

    this.queueManager.release()
    ;(this as Partial<Mutable<this>>).queueManager = undefined
  }

  async motionLastFrame(
    group: string,
    index: number,
    {
      expression = undefined
    }: {
      expression?: number | string
    } = {}
  ): Promise<boolean> {
    const motion = await this.getMotionAndApplyExpression(group, index, expression)

    if (!motion) {
      return false
    }

    this.playing = true

    motionSkipToLastFrame(
      this.queueManager,
      this.parent as CubismInternalModel,
      motion as CubismMotion
    )

    this.playing = false
    return true
  }

  private createIdVector(ids: string[]): csmVector<CubismIdHandle> {
    const vector = new csmVector<CubismIdHandle>()
    const idManager = CubismFramework.getIdManager()

    for (const id of ids) {
      vector.pushBack(idManager.getId(id))
    }

    return vector
  }
}
