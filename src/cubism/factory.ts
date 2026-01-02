import { CubismInternalModel } from '@/cubism/CubismInternalModel'
import { CubismModelSettings } from '@/cubism/CubismModelSettings'
import { cubismReady } from '@/cubism/setup'
import type { Live2DFactoryOptions } from '@/factory/Live2DFactory'
import { Live2DFactory } from '@/factory/Live2DFactory'
import { logger } from '@/utils'
import type * as CubismSpec from '@cubism/CubismSpec'
import { CubismPose } from '@cubism/effect/cubismpose'
import { CubismMoc } from '@cubism/model/cubismmoc'
import type { CubismModel } from '@cubism/model/cubismmodel'
import { CubismPhysics } from '@cubism/physics/cubismphysics'

type ModelWithMoc = { __moc?: CubismMoc }

Live2DFactory.registerRuntime({
  version: 4,

  ready: cubismReady,

  test(source: unknown): boolean {
    return source instanceof CubismModelSettings || CubismModelSettings.isValidJSON(source)
  },

  isValidMoc(modelData: ArrayBuffer): boolean {
    if (modelData.byteLength < 4) {
      return false
    }

    const view = new Int8Array(modelData, 0, 4)

    return String.fromCharCode(...view) === 'MOC3'
  },

  createModelSettings(json: CubismSpec.ModelJSON & { url: string }): CubismModelSettings {
    return new CubismModelSettings(json)
  },

  createCoreModel(data: ArrayBuffer, options?: Live2DFactoryOptions): CubismModel {
    const moc = CubismMoc.create(data, !!options?.checkMocConsistency)

    try {
      const model = moc.createModel()

      // store the moc instance so we can reference it later
      ;(model as ModelWithMoc).__moc = moc

      return model
    } catch (e) {
      try {
        moc.release()
      } catch (releaseError) {
        logger.warn(
          'CubismFactory',
          'Failed to release moc after core model creation failed.',
          releaseError
        )
      }

      throw e
    }
  },

  createInternalModel(
    coreModel: CubismModel,
    settings: CubismModelSettings,
    options?: Live2DFactoryOptions
  ): CubismInternalModel {
    const model = new CubismInternalModel(coreModel, settings, options)

    const coreModelWithMoc = coreModel as CubismModel & ModelWithMoc

    if (coreModelWithMoc.__moc) {
      // transfer the moc to InternalModel, because the coreModel will
      // probably have been set to undefined when we receive the "destroy" event
      ;(model as CubismInternalModel & ModelWithMoc).__moc = coreModelWithMoc.__moc

      delete coreModelWithMoc.__moc

      // release the moc when destroying
      model.once('destroy', releaseMoc)
    }

    return model
  },

  createPhysics(coreModel: CubismModel, data: unknown): CubismPhysics {
    return CubismPhysics.create(data)
  },

  createPose(coreModel: CubismModel, data: unknown): CubismPose {
    return CubismPose.create(data)
  }
})

function releaseMoc(this: CubismInternalModel) {
  ;(this as CubismInternalModel & ModelWithMoc).__moc?.release()
}
