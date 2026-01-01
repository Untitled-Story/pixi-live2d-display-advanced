import type { CubismMotionQueueManager } from '@cubism/motion/cubismmotionqueuemanager'
import type { CubismMotion } from '@cubism/motion/cubismmotion'
import type { Cubism4InternalModel } from '@/cubism4/Cubism4InternalModel'

export function motionSkipToLastFrame(
  queueManager: CubismMotionQueueManager,
  internalModel: Cubism4InternalModel,
  motion: CubismMotion
) {
  const motionQueueEntryHandle = queueManager.startMotion(motion, false)

  const motionQueueEntry = queueManager.getCubismMotionQueueEntry(motionQueueEntryHandle)!
  motionQueueEntry.setStartTime(0)
  motionQueueEntry.setFadeInStartTime(0)

  const duration = motion.getDuration()
  const currentTime = motionQueueEntry.getStartTime() + duration

  motion.doUpdateParameters(internalModel.coreModel, currentTime, 1.0, motionQueueEntry)
  motionQueueEntry.setIsFinished(true)
  return true
}
