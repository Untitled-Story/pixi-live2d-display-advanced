import type { MotionManagerOptions } from '@/cubism-common'
import { ExpressionManager } from '@/cubism-common/ExpressionManager'
import type { CubismLegacyModelSettings } from '@/cubism-legacy/CubismLegacyModelSettings'
import type { Cubism2Spec } from '@/types/Cubism2Spec'
import { Live2DExpression } from './Live2DExpression'

export class CubismLegacyExpressionManager extends ExpressionManager<Live2DExpression> {
  readonly queueManager = new MotionQueueManager()

  readonly definitions: Cubism2Spec.Expression[]

  declare readonly settings: CubismLegacyModelSettings

  constructor(settings: CubismLegacyModelSettings, options?: MotionManagerOptions) {
    super(settings, options)

    this.definitions = this.settings.expressions ?? []

    this.init()
  }

  isFinished(): boolean {
    return this.queueManager.isFinished()
  }

  getExpressionIndex(name: string): number {
    return this.definitions.findIndex((def) => def.name === name)
  }

  getExpressionFile(definition: Cubism2Spec.Expression): string {
    return definition.file
  }

  createExpression(
    data: object,
    _definition: Cubism2Spec.Expression | undefined
  ): Live2DExpression {
    return new Live2DExpression(data)
  }

  protected _setExpression(motion: Live2DExpression): number {
    return this.queueManager.startMotion(motion)
  }

  protected stopAllExpressions(): void {
    this.queueManager.stopAllMotions()
  }

  protected updateParameters(model: Live2DModelWebGL, _dt: number): boolean {
    return this.queueManager.updateParam(model)
  }
}
