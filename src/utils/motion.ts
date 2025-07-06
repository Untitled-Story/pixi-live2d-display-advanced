import type { InternalModel } from '@/cubism-common'
import { Cubism2InternalModel } from '@/cubism2'
import { Cubism4InternalModel } from '@/cubism4'
import { CubismMotion } from '@cubism/motion/cubismmotion'
import { CubismMotionQueueManager } from '@cubism/motion/cubismmotionqueuemanager'

export function motionSkipToLastFrame(
  queueManager: MotionQueueManager | CubismMotionQueueManager,
  internalModel: InternalModel,
  motion: Live2DMotion | CubismMotion
) {
  if (
    queueManager instanceof MotionQueueManager &&
    internalModel instanceof Cubism2InternalModel &&
    motion instanceof Live2DMotion
  ) {
    const duration = motion.getDurationMSec()

    const motionQueueEntNo = queueManager.startMotion(motion, true)

    const motionQueueEnt = queueManager.motions.find(
      (entry) => entry && entry._$sr === motionQueueEntNo
    )

    if (!motionQueueEnt) {
      return false
    }

    motion.updateParamExe(
      internalModel.coreModel as Live2DModelWebGL,
      duration,
      1.0,
      motionQueueEnt
    )

    return true
  } else if (
    queueManager instanceof CubismMotionQueueManager &&
    internalModel instanceof Cubism4InternalModel &&
    motion instanceof CubismMotion
  ) {
    const motionQueueEntryHandle = queueManager.startMotion(motion, false, performance.now())

    const motionQueueEntry = queueManager.getCubismMotionQueueEntry(motionQueueEntryHandle)!

    const duration = motion.getDuration()
    const currentTime = motionQueueEntry.getStartTime() + duration

    motion.doUpdateParameters(internalModel.coreModel, currentTime, 1.0, motionQueueEntry)
    motionQueueEntry.setIsFinished(true)
    return true
  } else {
    return false
  }
}
