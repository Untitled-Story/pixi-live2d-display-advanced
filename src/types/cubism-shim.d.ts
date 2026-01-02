declare module '@cubism/*' {
  export interface CubismStartupOption {
    logFunction?: (...args: unknown[]) => void
    loggingLevel?: LogLevel
  }

  export enum LogLevel {
    LogLevel_Verbose
  }

  export interface CubismIdHandle {
    getString?: () => { s: string }
  }

  export class CubismIdManager {
    getId(id: string): CubismIdHandle
  }

  export class CubismMatrix44 {
    scale(x: number, y: number): CubismMatrix44
    translate(x: number, y: number): CubismMatrix44
    getArray(): Float32Array
  }

  export class CubismModel {
    getModel(): { canvasinfo: { CanvasWidth: number; CanvasHeight: number; PixelsPerUnit: number } }
    getDrawableCount(): number
    getDrawableId(index: number): { getString(): { s: string } }
    getDrawableVertices(index: number): Float32Array
    getDrawableIndex(id: CubismIdHandle): number
    saveParameters(): void
    addParameterValueById(id: string | CubismIdHandle, value: number, weight?: number): void
    update(): void
    loadParameters(): void
    release(): void
  }

  export class CubismMoc {
    static create(data: ArrayBuffer, shouldCheckConsistency?: boolean): CubismMoc
    createModel(): CubismModel
    release(): void
  }

  export class CubismRenderer_WebGL {
    firstDraw: boolean
    _bufferData: { vertex: WebGLBuffer | null; uv: WebGLBuffer | null; index: WebGLBuffer | null }
    _clippingManager?: { _currentFrameNo: number; _maskTexture: unknown }

    initialize(model: CubismModel): void
    setIsPremultipliedAlpha(flag: boolean): void
    bindTexture(index: number, texture: WebGLTexture): void
    startUp(gl: WebGLRenderingContext): void
    setMvpMatrix(matrix: CubismMatrix44): void
    setRenderState(framebuffer: WebGLFramebuffer | null, viewport: readonly number[]): void
    drawModel(): void
    release(): void
  }

  export class CubismShaderManager_WebGL {
    static getInstance(): CubismShaderManager_WebGL
    setGlContext(gl: WebGLRenderingContext): void
  }

  export class ACubismMotion {}

  export class CubismMotion {
    static create(
      data: ArrayBuffer,
      size: number,
      onFinishedMotionHandler?: (motion: ACubismMotion) => void,
      onBeganMotionHandler?: (motion: ACubismMotion) => void,
      shouldCheckMotionConsistency?: boolean
    ): CubismMotion

    _motionData: { curves: Array<{ id?: string }>; curveCount: number }

    setFinishedMotionHandler(handler: (motion: ACubismMotion) => void): void
    setFadeInTime(time: number): void
    setFadeOutTime(time: number): void
    setEffectIds(eyeBlinkIds: string[], lipSyncIds: string[]): void
    getDuration(): number
    doUpdateParameters(
      model: CubismModel,
      time: number,
      weight: number,
      entry: CubismMotionQueueEntry
    ): void
  }

  export class CubismMotionJson {
    constructor(buffer: ArrayBuffer, size: number)
    getMotionFadeInTime(): number | undefined
    getMotionFadeOutTime(): number | undefined
  }

  export class CubismMotionQueueEntry {
    setStartTime(time: number): void
    setFadeInStartTime(time: number): void
    getStartTime(): number
    setIsFinished(finished: boolean): void
  }

  export class CubismMotionQueueManager {
    startMotion(motion: ACubismMotion, autoDelete: boolean): number
    stopAllMotions(): void
    isFinished(): boolean
    doUpdateMotion(model: CubismModel, now: DOMHighResTimeStamp): boolean
    setEventCallback(
      handler: (
        caller: unknown,
        eventValue: string | number | undefined,
        customData: unknown
      ) => void
    ): void
    getCubismMotionQueueEntry(handle: number): CubismMotionQueueEntry | undefined
    release(): void
  }

  export class CubismExpressionMotion {
    static create(buffer: ArrayBuffer, size: number): CubismExpressionMotion
  }

  export interface ICubismModelSetting {
    getEyeBlinkParameterCount(): number
    getEyeBlinkParameterId(index: number): { getString?: () => { s: string } }
    getLipSyncParameterCount(): number
    getLipSyncParameterId(index: number): { getString?: () => { s: string } }
  }

  export class CubismModelSettingJson implements ICubismModelSetting {
    constructor(buffer: ArrayBuffer, size: number)
    getEyeBlinkParameterCount(): number
    getEyeBlinkParameterId(index: number): { getString?: () => { s: string } }
    getLipSyncParameterCount(): number
    getLipSyncParameterId(index: number): { getString?: () => { s: string } }
  }

  export class BreathParameterData {
    constructor(id: CubismIdHandle, offset: number, peak: number, cycle: number, weight: number)
  }

  export class CubismBreath {
    static create(): CubismBreath
    setParameters(parameters: csmVector<BreathParameterData>): void
    updateParameters(model: CubismModel, deltaSeconds: number): void
  }

  export class CubismEyeBlink {
    static create(setting?: unknown): CubismEyeBlink
    setParameterIds?(ids: csmVector<CubismIdHandle>): void
    updateParameters?(model: CubismModel, deltaSeconds: number): void
  }

  export class CubismPose {
    static create(data: unknown): CubismPose
    updateParameters(model: CubismModel, deltaSeconds: number): void
  }

  export class CubismPhysics {
    static create(data: unknown): CubismPhysics
    evaluate(model: CubismModel, deltaSeconds: number): void
  }

  export const CubismDefaultParameterId: Record<string, string>

  export class CubismFramework {
    static startUp(option?: CubismStartupOption): void
    static initialize(): void
    static isStarted(): boolean
    static getIdManager(): CubismIdManager
  }

  export namespace CubismSpec {
    export interface Motion {
      File: string
      FadeInTime?: number
      FadeOutTime?: number
      Sound?: string
    }

    export interface Expression {
      Name?: string
      File: string
    }

    export type ParameterGroupId = string | { Id?: string }

    export interface ModelJSON {
      FileReferences: {
        Moc: string
        Textures: string[]
        Pose?: string
        Physics?: string
        Expressions?: Expression[]
      }
      Groups?: { Name?: string; Ids?: ParameterGroupId[] }[]
      Layout?: Record<string, number>
      HitAreas?: { Id: string; Name: string }[]
      Motions?: Record<string, Motion[]>
    }
  }

  export type ModelJSON = CubismSpec.ModelJSON
  export type Motion = CubismSpec.Motion
  export type Expression = CubismSpec.Expression

  export class csmVector<T = unknown> extends Array<T> {
    constructor(...args: never[])
    pushBack(item: T): void
    getSize(): number
    [index: number]: T
  }

  const _default: unknown
  export default _default
}

export {}
