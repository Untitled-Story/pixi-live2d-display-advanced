// noinspection DuplicatedCode

import { ParallelMotionManager } from '@/cubism-common/ParallelMotionManager'
import type { Cubism2Spec } from '@/types/Cubism2Spec'
import type { Mutable } from '@/types/helpers'
import './patch-motion'
import { MotionPriority } from '@/cubism-common'
import type { Cubism2InternalModel } from '@/cubism2/Cubism2InternalModel'
import { motionSkipToLastFrame } from '@/cubism2/MotionSkipLastFrameHelper'
import { logger } from '@/utils'

export class Cubism2ParallelMotionManager extends ParallelMotionManager<
  Live2DMotion,
  Cubism2Spec.Motion
> {
  readonly queueManager = new MotionQueueManager()

  constructor(parent: Cubism2InternalModel) {
    super(parent)
  }

  isFinished(): boolean {
    return this.queueManager.isFinished()
  }

  protected getMotionName(definition: Cubism2Spec.Motion): string {
    return definition.file
  }

  protected _startMotion(
    motion: Live2DMotion,
    onFinish?: (motion: Live2DMotion) => void,
    ignoreParamIds?: string[]
  ): number {
    motion.onFinishHandler = onFinish

    if (ignoreParamIds && ignoreParamIds.length > 0) {
      motion.motions = motion.motions.filter((item) => {
        return !ignoreParamIds.includes(item._$4P)
      })
    }

    this.queueManager.stopAllMotions()
    return this.queueManager.startMotion(motion)
  }

  protected _stopAllMotions(): void {
    this.queueManager.stopAllMotions()
  }

  protected updateParameters(model: Live2DModelWebGL, _now: DOMHighResTimeStamp): boolean {
    return this.queueManager.updateParam(model)
  }

  destroy() {
    super.destroy()
    ;(this as Partial<Mutable<this>>).queueManager = undefined
  }

  async playMotionLastFrame(group: string, index: number): Promise<boolean> {
    if (!this.state.reserve(group, index, MotionPriority.FORCE)) {
      return false
    }

    const definition = this.manager.definitions[group]?.[index]
    if (!definition) {
      return false
    }

    const motion = (await this.manager.loadMotion(group, index)) as Live2DMotion
    if (!this.state.start(motion, group, index, MotionPriority.FORCE)) {
      return false
    }

    logger.log(this.tag, 'Start motion:', this.getMotionName(definition as Cubism2Spec.Motion))

    this.queueManager.stopAllMotions()

    this.emit('motionStart', group, index, undefined)

    this.playing = true

    if (!motionSkipToLastFrame(this.queueManager, this.parent as Cubism2InternalModel, motion)) {
      return false
    }

    this.playing = false
    return true
  }
}
