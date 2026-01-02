import { CubismLegacyInternalModel } from '@/cubism-legacy/CubismLegacyInternalModel'
import { CubismLegacyModelSettings } from '@/cubism-legacy/CubismLegacyModelSettings'
import { Live2DPhysics } from '@/cubism-legacy/Live2DPhysics'
import { Live2DPose } from '@/cubism-legacy/Live2DPose'
import type { Live2DFactoryOptions } from '@/factory/Live2DFactory'
import { Live2DFactory } from '@/factory/Live2DFactory'
import type { Cubism2Spec } from '@/types/Cubism2Spec'

Live2DFactory.registerRuntime({
  version: 2,

  test(source: unknown): boolean {
    return (
      source instanceof CubismLegacyModelSettings || CubismLegacyModelSettings.isValidJSON(source)
    )
  },

  ready(): Promise<void> {
    return Promise.resolve()
  },

  isValidMoc(modelData: ArrayBuffer): boolean {
    if (modelData.byteLength < 3) {
      return false
    }

    const view = new Int8Array(modelData, 0, 3)

    return String.fromCharCode(...view) === 'moc'
  },

  createModelSettings(json: Cubism2Spec.ModelJSON & { url: string }): CubismLegacyModelSettings {
    return new CubismLegacyModelSettings(json)
  },

  createCoreModel(data: ArrayBuffer): Live2DModelWebGL {
    const model = Live2DModelWebGL.loadModel(data)

    const error = Live2D.getError()
    if (error) {
      if (error instanceof Error) {
        throw error
      }

      const message = typeof error === 'string' ? error : `Live2D error: ${JSON.stringify(error)}`
      throw new Error(message)
    }

    return model
  },

  createInternalModel(
    coreModel: Live2DModelWebGL,
    settings: CubismLegacyModelSettings,
    options?: Live2DFactoryOptions
  ): CubismLegacyInternalModel {
    return new CubismLegacyInternalModel(coreModel, settings, options)
  },

  createPose(coreModel: Live2DModelWebGL, data: Cubism2Spec.PoseJSON): Live2DPose {
    return new Live2DPose(coreModel, data)
  },

  createPhysics(coreModel: Live2DModelWebGL, data: Cubism2Spec.PhysicsJSON): Live2DPhysics {
    return new Live2DPhysics(coreModel, data)
  }
})
