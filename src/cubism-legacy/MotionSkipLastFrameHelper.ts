import type { CubismLegacyInternalModel } from '@/cubism-legacy/CubismLegacyInternalModel'

export function motionSkipToLastFrame(
  queueManager: MotionQueueManager,
  internalModel: CubismLegacyInternalModel,
  motion: Live2DMotion
) {
  const duration = motion.getDurationMSec()

  const motionQueueEntNo = queueManager.startMotion(motion, true)

  type MotionEntry = Live2DObfuscated.MotionQueueEnt & { _$sr?: number }
  const motionQueueEnt = (queueManager.motions as Array<MotionEntry | null>).find(
    (entry): entry is MotionEntry => !!entry && entry._$sr === motionQueueEntNo
  )

  if (!motionQueueEnt) {
    return false
  }

  motion.updateParamExe(internalModel.coreModel, duration, 1.0, motionQueueEnt)

  return true
}
