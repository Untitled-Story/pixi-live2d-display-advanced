import type { CubismMotionQueueManager } from '@cubism/motion/cubismmotionqueuemanager'
import type { CubismMotion } from '@cubism/motion/cubismmotion'
import type { CubismInternalModel } from '@/cubism/CubismInternalModel'

export function motionSkipToLastFrame(
  queueManager: CubismMotionQueueManager,
  internalModel: CubismInternalModel,
  motion: CubismMotion
) {
  const motionQueueEntryHandle = queueManager.startMotion(motion, false)

  const motionQueueEntry = queueManager.getCubismMotionQueueEntry(motionQueueEntryHandle)

  if (!motionQueueEntry) {
    return false
  }

  motionQueueEntry.setStartTime(0)
  motionQueueEntry.setFadeInStartTime(0)

  const duration = motion.getDuration()
  const currentTime = motionQueueEntry.getStartTime() + duration

  motion.doUpdateParameters(internalModel.coreModel, currentTime, 1.0, motionQueueEntry)
  motionQueueEntry.setIsFinished(true)
  return true
}
