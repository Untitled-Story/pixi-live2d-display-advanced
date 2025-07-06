import { ParallelMotionManager } from '@/cubism-common/ParallelMotionManager'
import type { Cubism4ModelSettings } from '@/cubism4/Cubism4ModelSettings'
import type { CubismSpec } from '@cubism/CubismSpec'
import type { CubismModel } from '@cubism/model/cubismmodel'
import type { ACubismMotion } from '@cubism/motion/acubismmotion'
import type { CubismMotion } from '@cubism/motion/cubismmotion'
import { CubismMotionQueueManager } from '@cubism/motion/cubismmotionqueuemanager'
import type { Mutable } from '@/types/helpers'
import { MotionPriority } from '@/cubism-common'
import type { Cubism4InternalModel } from '@/cubism4/Cubism4InternalModel'

export class Cubism4ParallelMotionManager extends ParallelMotionManager<
  CubismMotion,
  CubismSpec.Motion
> {
  readonly queueManager = new CubismMotionQueueManager()

  declare readonly settings: Cubism4ModelSettings

  constructor(parent: Cubism4InternalModel) {
    super(parent)

    this.init()
  }

  protected init() {
    this.queueManager.setEventCallback((_caller, eventValue, _customData) => {
      this.emit('motion:' + eventValue)
    })
  }

  isFinished(): boolean {
    return this.queueManager.isFinished()
  }

  protected _startMotion(motion: CubismMotion, onFinish?: (motion: CubismMotion) => void): number {
    motion.setFinishedMotionHandler(onFinish as (motion: ACubismMotion) => void)

    this.queueManager.stopAllMotions()
    return this.queueManager.startMotion(motion, false, performance.now())
  }

  protected _stopAllMotions(): void {
    this.queueManager.stopAllMotions()
  }

  protected updateParameters(model: CubismModel, now: DOMHighResTimeStamp): boolean {
    return this.queueManager.doUpdateMotion(model, now)
  }

  protected getMotionName(definition: CubismSpec.Motion): string {
    return definition.File
  }

  destroy() {
    super.destroy()

    this.queueManager.release()
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

    const motion = await this.manager.loadMotion(group, index)
    if (!this.state.start(motion, group, index, MotionPriority.FORCE)) {
      return false
    }

    this.emit('motionStart', group, index, undefined)

    this.playing = true

    this.queueManager.stopAllMotions()

    const motionQueueEntryHandle = this.queueManager.startMotion(motion, false, performance.now())

    const motionQueueEntry = this.queueManager.getCubismMotionQueueEntry(motionQueueEntryHandle)!

    const duration = motion.getDuration()
    const currentTime = motionQueueEntry.getStartTime() + duration

    motion.doUpdateParameters(this.parent.coreModel, currentTime, 1.0, motionQueueEntry)
    motionQueueEntry.setIsFinished(true)
    this.playing = false

    return true
  }
}
