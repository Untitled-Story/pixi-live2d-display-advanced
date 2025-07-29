import type { Cubism2InternalModel } from '@/cubism2/Cubism2InternalModel'

export function motionSkipToLastFrame(
  queueManager: MotionQueueManager,
  internalModel: Cubism2InternalModel,
  motion: Live2DMotion
) {
  const duration = motion.getDurationMSec()

  const motionQueueEntNo = queueManager.startMotion(motion, true)

  const motionQueueEnt = queueManager.motions.find(
    (entry) => entry && entry._$sr === motionQueueEntNo
  )

  if (!motionQueueEnt) {
    return false
  }

  motion.updateParamExe(internalModel.coreModel as Live2DModelWebGL, duration, 1.0, motionQueueEnt)

  return true
}
