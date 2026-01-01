/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@cubism/*' {
  // common classes/types we import from the Cubism SDK; all stubbed to any for typecheck-only builds
  export const CubismDefaultParameterId: any

  export type CubismModel = any
  export const CubismModel: any
  export type CubismPhysics = any
  export const CubismPhysics: any
  export type CubismRenderer_WebGL = any
  export const CubismRenderer_WebGL: any
  export type CubismShaderManager_WebGL = any
  export const CubismShaderManager_WebGL: any
  export type CubismMatrix44 = any
  export const CubismMatrix44: any
  export type CubismFramework = any
  export const CubismFramework: any
  export type CubismStartupOption = any
  export type LogLevel = any
  export const LogLevel: any

  export type CubismIdManager = any
  export const CubismIdManager: any
  export type CubismIdHandle = any

  export type BreathParameterData = any
  export const BreathParameterData: any
  export type CubismBreath = any
  export const CubismBreath: any
  export type CubismEyeBlink = any
  export const CubismEyeBlink: any
  export type CubismPose = any
  export const CubismPose: any
  export type CubismMoc = any
  export const CubismMoc: any

  export type CubismModelSettingJson = any
  export const CubismModelSettingJson: any
  export type ICubismModelSetting = any
  export namespace CubismSpec {
    export type ModelJSON = any
    export type Motion = any
    export type Expression = any
  }

  export type ACubismMotion = any
  export const ACubismMotion: any
  export type CubismMotion = any
  export const CubismMotion: any
  export type CubismMotionJson = any
  export const CubismMotionJson: any
  export type CubismMotionQueueManager = any
  export const CubismMotionQueueManager: any

  export type CubismExpressionMotion = any
  export const CubismExpressionMotion: any
  export type CubismMotionManager = any

  export class csmVector<T = any> {
    constructor(...args: any[])
    pushBack(item: T): void
    getSize(): number
    [index: number]: T
  }

  const _default: any
  export default _default
}

export {}
