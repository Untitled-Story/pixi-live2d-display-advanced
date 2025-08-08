import type {
  InternalModel,
  InternalModelOptions,
  ModelSettings,
  MotionPriority
} from '@/cubism-common'
import { VOLUME } from '@/cubism-common/SoundManager'
import type { Live2DFactoryOptions } from '@/factory/Live2DFactory'
import { Live2DFactory } from '@/factory/Live2DFactory'
import type { Rectangle, Renderer, Texture, Ticker } from '@pixi/core'
import { Matrix, ObservablePoint, Point } from '@pixi/core'
import { Container } from '@pixi/display'
import { Automator, type AutomatorOptions } from './Automator'
import { Live2DTransform } from './Live2DTransform'
import type { JSONObject } from './types/helpers'
import { logger } from './utils'

export interface Live2DModelOptions extends InternalModelOptions, AutomatorOptions {}

const tempPoint = new Point()
const tempMatrix = new Matrix()

export type Live2DConstructor = { new (options?: Live2DModelOptions): Live2DModel }

// noinspection JSUnusedGlobalSymbols
/**
 * A wrapper that allows the Live2D model to be used as a DisplayObject in PixiJS.
 *
 * ```js
 * const model = await Live2DModel.from('shizuku.model.json');
 * container.add(model);
 * ```
 * @emits {@link Live2DModelEvents}
 */
export class Live2DModel<IM extends InternalModel = InternalModel> extends Container {
  /**
   * Creates a Live2DModel from given source.
   * @param source - Can be one of: settings file URL, settings JSON object, ModelSettings instance.
   * @param options - Options for the creation.
   * @return Promise that resolves with the Live2DModel.
   */
  static async from<M extends Live2DConstructor = typeof Live2DModel>(
    this: M,
    source: string | JSONObject | ModelSettings,
    options?: Live2DFactoryOptions
  ): Promise<InstanceType<M>> {
    const model = new this(options) as InstanceType<M>

    await Live2DFactory.setupLive2DModel(model, source, options)
    return model
  }

  /**
   * Synchronous version of `Live2DModel.from()`. This method immediately returns a Live2DModel instance,
   * whose resources have not been loaded. Therefore, this model can't be manipulated or rendered
   * until the "load" event has been emitted.
   *
   * ```js
   * // no `await` here as it's not a Promise
   * const model = Live2DModel.fromSync('shizuku.model.json');
   *
   * // these will cause errors!
   * // app.stage.addChild(model);
   * // model.motion('tap_body');
   *
   * model.once('load', () => {
   *     // now it's safe
   *     app.stage.addChild(model);
   *     model.motion('tap_body');
   * });
   * ```
   * @param source - Model source, can be a file path, JSON object, or ModelSettings instance.
   * @param options - Options for the model creation.
   * @returns The created Live2DModel instance.
   */
  static fromSync<M extends Live2DConstructor = typeof Live2DModel>(
    this: M,
    source: string | JSONObject | ModelSettings,
    options?: Live2DFactoryOptions
  ): InstanceType<M> {
    const model = new this(options) as InstanceType<M>

    Live2DFactory.setupLive2DModel(model, source, options)
      .then(options?.onLoad)
      .catch(options?.onError)

    return model
  }

  /**
   * Registers the class of `PIXI.Ticker` for auto updating.
   * @deprecated Use {@link Live2DModelOptions.ticker} instead.
   * @param tickerClass - The Ticker class to be registered.
   */
  static registerTicker(tickerClass: typeof Ticker): void {
    Automator['defaultTicker'] = tickerClass.shared
  }

  /**
   * Tag for logging.
   * @type {string}
   */
  tag: string = 'Live2DModel(uninitialized)'

  /**
   * The internal model. Though typed as non-nullable, it'll be undefined until the "ready" event is emitted.
   */
  internalModel!: IM

  /**
   * Pixi textures.
   * @type {Texture[]}
   */
  textures: Texture[] = []

  /** @override
   * The Live2DTransform instance for this model.
   */
  transform = new Live2DTransform()

  /**
   * The anchor behaves like the one in `PIXI.Sprite`, where `(0, 0)` means the top left
   * and `(1, 1)` means the bottom right.
   * @type {ObservablePoint}
   */
  anchor: ObservablePoint<never> = new ObservablePoint(
    this.onAnchorChange,
    this,
    0,
    0
  ) as ObservablePoint<never> // cast the type because it breaks the casting of Live2DModel

  /**
   * An ID of Gl context that syncs with `renderer.CONTEXT_UID`. Used to check if the GL context has changed.
   * @protected
   * @type {number}
   */
  protected glContextID: number = -1

  /**
   * Elapsed time in milliseconds since created.
   * @type {DOMHighResTimeStamp}
   */
  elapsedTime: DOMHighResTimeStamp = 0

  /**
   * Elapsed time in milliseconds from last frame to this frame.
   * @type {DOMHighResTimeStamp}
   */
  deltaTime: DOMHighResTimeStamp = 0

  /**
   * The Automator instance that controls model automation.
   * @type {Automator}
   */
  automator: Automator

  /**
   * Creates a new Live2DModel instance.
   * @param options - Options for Live2DModel and Automator.
   */
  constructor(options?: Live2DModelOptions) {
    super()

    this.automator = new Automator(this, options)

    this.once('modelLoaded', () => this.initializeOnModelLoad(options))
  }

  /**
   * A handler of the "modelLoaded" event, invoked when the internal model has been loaded.
   * @protected
   * @param _options - The options used for initialization.
   */
  protected initializeOnModelLoad(_options?: Live2DModelOptions) {
    this.tag = `Live2DModel(${this.internalModel.settings.name})`
  }

  /**
   * A callback that observes {@link anchor}, invoked when the anchor's values have been changed.
   * @protected
   */
  protected onAnchorChange(): void {
    this.pivot.set(
      this.anchor.x * this.internalModel.width,
      this.anchor.y * this.internalModel.height
    )
  }

  /**
   * Shorthand to start a motion.
   * @param group - The motion group.
   * @param [index] - Index in the motion group.
   * @param [priority=2] - The priority to be applied. (0: No priority, 1: IDLE, 2:NORMAL, 3:FORCE)
   * @param {Object} options - Additional options for motion.
   * @param [options.sound] - The audio url to file or base64 content.
   * @param [options.volume=0.5] - Volume of the sound (0-1).
   * @param [options.expression] - In case you want to mix up an expression while playing sound (bind with Model.expression()).
   * @param [options.resetExpression=true] - Reset the expression to default after the motion is finished.
   * @param [options.onFinish] - Callback function when speaking completes.
   * @param [options.onError] - Callback function when an error occurs.
   * @return Promise that resolves with true if the motion is successfully started, with false otherwise.
   */
  async motion(
    group: string,
    index?: number,
    priority?: MotionPriority,
    {
      sound = undefined,
      volume = VOLUME,
      expression = undefined,
      resetExpression = true,
      onFinish,
      onError
    }: {
      sound?: string
      volume?: number
      expression?: number | string
      resetExpression?: boolean
      onFinish?: () => void
      onError?: (e: Error) => void
    } = {}
  ): Promise<boolean> {
    if (index === undefined) {
      return this.internalModel.motionManager.startRandomMotion(group, priority, {
        sound: sound,
        volume: volume,
        expression: expression,
        resetExpression: resetExpression,
        onFinish: onFinish,
        onError: onError
      })
    } else {
      return this.internalModel.motionManager.startMotion(group, index, priority, {
        sound: sound,
        volume: volume,
        expression: expression,
        resetExpression: resetExpression,
        onFinish: onFinish,
        onError: onError
      })
    }
  }

  async motionLastFrame(
    group: string,
    id: number,
    {
      expression = undefined
    }: {
      expression?: number | string
    } = {}
  ): Promise<boolean> {
    return this.internalModel.motionManager.motionLastFrame(group, id, { expression: expression })
  }

  /**
   * Shorthand to start multiple motions in parallel.
   * @param motionList - The motion list, each item includes:
   *  group: The motion group,
   *  index: Index in the motion group,
   *  priority: The priority to be applied. (0: No priority, 1: IDLE, 2:NORMAL, 3:FORCE) (default: 2)
   * @return Promise that resolves with a list, indicates the motion is successfully started, with false otherwise.
   */
  async parallelMotion(
    motionList: {
      group: string
      index: number
      priority?: MotionPriority
    }[]
  ): Promise<boolean[]> {
    this.internalModel.extendParallelMotionManager(motionList.length)
    const result = motionList.map((m, idx) =>
      this.internalModel.parallelMotionManager[idx]!.startMotion(m.group, m.index, m.priority)
    )
    const flags: boolean[] = []
    for (const r of result) {
      flags.push(await r!)
    }
    return flags
  }

  /**
   * Shorthand to play the last frame of multiple motions in parallel and await their completion.
   *
   * This method initiates the final frame of each specified motion concurrently,
   * leveraging the internal parallel motion manager. Each motion's completion is awaited
   * sequentially, and the results are returned as an array of success flags.
   *
   * @async
   * @param {{group: string, index: number, priority?: MotionPriority}[]} motionList - Array of motions to execute.
   * @param {string} motionList.group - Motion group identifier (e.g., "idle", "walk").
   * @param {number} motionList.index - Index within the motion group.
   * @param {MotionPriority} [motionList.priority=2] - Motion priority (0: None, 1: IDLE, 2: NORMAL, 3: FORCE).
   * @returns {Promise<boolean[]>} Resolves with an array where each boolean indicates
   *                               whether the corresponding motion completed successfully.
   */
  async parallelLastFrame(
    motionList: {
      group: string
      index: number
    }[]
  ): Promise<boolean[]> {
    this.internalModel.extendParallelMotionManager(motionList.length)
    const result = motionList.map((m, idx) =>
      this.internalModel.parallelMotionManager[idx]!.playMotionLastFrame(m.group, m.index)
    )
    const flags: boolean[] = []
    for (const r of result) {
      flags.push(await r!)
    }
    return flags
  }

  /**
   * Stops all playing motions as well as the sound.
   */
  stopMotions(): void {
    return this.internalModel.motionManager.stopAllMotions()
  }

  /**
   * Shorthand to start speaking a sound with an expression.
   * @param sound - The audio url to file or base64 content.
   * @param {Object} options - Additional options for speaking.
   * @param [options.volume] - Volume of the sound (0-1).
   * @param [options.expression] - In case you want to mix up an expression while playing sound (bind with Model.expression()).
   * @param [options.resetExpression=true] - Reset the expression to default after the motion is finished.
   * @param [options.onFinish] - Callback function when speaking completes.
   * @param [options.onError] - Callback function when an error occurs.
   * @returns Promise that resolves with true if the sound is playing, false if it's not.
   */
  speak(
    sound: string,
    {
      volume = VOLUME,
      expression,
      resetExpression = true,
      onFinish,
      onError
    }: {
      volume?: number
      expression?: number | string
      resetExpression?: boolean
      onFinish?: () => void
      onError?: (e: Error) => void
    } = {}
  ): Promise<boolean> {
    return this.internalModel.motionManager.speak(sound, {
      volume: volume,
      expression: expression,
      resetExpression: resetExpression,
      onFinish: onFinish,
      onError: onError
    })
  }

  /**
   * Stop current audio playback and lipsync.
   */
  stopSpeaking(): void {
    return this.internalModel.motionManager.stopSpeaking()
  }

  /**
   * Shorthand to set an expression.
   * @param id - Either the index, or the name of the expression. If not presented, a random expression will be set.
   * @return Promise that resolves with true if succeeded, with false otherwise.
   */
  expression(id?: number | string): Promise<boolean> {
    if (this.internalModel.motionManager.expressionManager) {
      return id === undefined
        ? this.internalModel.motionManager.expressionManager.setRandomExpression()
        : this.internalModel.motionManager.expressionManager.setExpression(id)
    }
    return Promise.resolve(false)
  }

  /**
   * Updates the focus position. This will not cause the model to immediately look at the position,
   * instead the movement will be interpolated.
   * @param x - Position in world space.
   * @param y - Position in world space.
   * @param instant - Should the focus position be instantly applied.
   */
  focus(x: number, y: number, instant: boolean = false): void {
    tempPoint.x = x
    tempPoint.y = y

    // we can pass `true` as the third argument to skip the update transform
    // because focus won't take effect until the model is rendered,
    // and a model being rendered will always get transform updated
    this.toModelPosition(tempPoint, tempPoint, true)

    const tx = (tempPoint.x / this.internalModel.originalWidth) * 2 - 1
    const ty = (tempPoint.y / this.internalModel.originalHeight) * 2 - 1
    const radian = Math.atan2(ty, tx)
    this.internalModel.focusController.focus(Math.cos(radian), -Math.sin(radian), instant)
  }

  /**
   * Tap on the model. This will perform a hit-testing, and emit a "hit" event
   * if at least one of the hit areas is hit.
   * @param x - Position in world space.
   * @param y - Position in world space.
   * @emits {@link Live2DModelEvents.hit}
   */
  tap(x: number, y: number): void {
    const hitAreaNames = this.hitTest(x, y)

    if (hitAreaNames.length) {
      logger.log(this.tag, `Hit`, hitAreaNames)

      this.emit('hit', hitAreaNames)
    }
  }

  /**
   * Hit-test on the model.
   * @param x - Position in world space.
   * @param y - Position in world space.
   * @return The names of the *hit* hit areas. Can be empty if none is hit.
   */
  hitTest(x: number, y: number): string[] {
    tempPoint.x = x
    tempPoint.y = y
    this.toModelPosition(tempPoint, tempPoint)

    return this.internalModel.hitTest(tempPoint.x, tempPoint.y)
  }

  /**
   * Calculates the position in the canvas of original, unscaled Live2D model.
   * @param position - A Point in world space.
   * @param result - A Point to store the new value. Defaults to a new Point.
   * @param skipUpdate - True to skip the update transform.
   * @return The Point in model canvas space.
   */
  toModelPosition(position: Point, result: Point = position.clone(), skipUpdate?: boolean): Point {
    if (!skipUpdate) {
      this._recursivePostUpdateTransform()

      if (!this.parent) {
        ;(this.parent as unknown) = this._tempDisplayObjectParent
        this.displayObjectUpdateTransform()
        ;(this.parent as unknown) = null
      } else {
        this.displayObjectUpdateTransform()
      }
    }

    this.transform.worldTransform.applyInverse(position, result)
    this.internalModel.localTransform.applyInverse(result, result)

    return result
  }

  /**
   * A method required by `PIXI.InteractionManager` to perform hit-testing.
   * @param point - A Point in world space.
   * @return True if the point is inside this model.
   */
  containsPoint(point: Point): boolean {
    return this.getBounds(true).contains(point.x, point.y)
  }

  /** @override
   * Calculates the bounds of the Live2DModel for rendering and interaction purposes.
   */
  protected _calculateBounds(): void {
    this._bounds.addFrame(this.transform, 0, 0, this.internalModel.width, this.internalModel.height)
  }

  /**
   * Updates the model. Note this method just updates the timer,
   * and the actual update will be done right before rendering the model.
   * @param dt - The elapsed time in milliseconds since last frame.
   */
  update(dt: DOMHighResTimeStamp): void {
    this.deltaTime += dt
    this.elapsedTime += dt

    // don't call `this.internalModel.update()` here, because it requires WebGL context
  }

  /** @override
   * Renders the Live2DModel to the renderer.
   * @param renderer - The PixiJS Renderer instance.
   */
  override _render(renderer: Renderer): void {
    // reset certain systems in renderer to make Live2D's drawing system compatible with Pixi
    renderer.batch.reset()
    renderer.geometry.reset()
    renderer.shader.reset()
    renderer.state.reset()

    let shouldUpdateTexture = false

    // when the WebGL context has changed
    if (this.glContextID !== renderer.CONTEXT_UID) {
      this.glContextID = renderer.CONTEXT_UID

      this.internalModel.updateWebGLContext(renderer.gl, this.glContextID)

      shouldUpdateTexture = true
    }

    for (let i = 0; i < this.textures.length; i++) {
      const texture = this.textures[i]!

      if (!texture.valid) {
        continue
      }

      if (shouldUpdateTexture || !texture.baseTexture._glTextures[this.glContextID]) {
        renderer.gl.pixelStorei(
          WebGLRenderingContext.UNPACK_FLIP_Y_WEBGL,
          this.internalModel.textureFlipY
        )

        // let the TextureSystem generate corresponding WebGLTexture, and bind to an arbitrary location
        renderer.texture.bind(texture.baseTexture, 0)
      }

      // bind the WebGLTexture into Live2D core.
      // because the Texture in Pixi can be shared between multiple DisplayObjects,
      // it's unable to know if the WebGLTexture in this Texture has been destroyed (GCed) and regenerated,
      // and therefore we always bind the texture at this moment no matter what
      this.internalModel.bindTexture(i, texture.baseTexture._glTextures[this.glContextID]!.texture)

      // manually update the GC counter so they won't be GCed while using this model
      texture.baseTexture.touched = renderer.textureGC.count
    }

    const viewport = renderer.framebuffer.viewport as Rectangle
    this.internalModel.viewport = [viewport.x, viewport.y, viewport.width, viewport.height]

    // update only if the time has changed, as the model will possibly be updated once but rendered multiple times
    if (this.deltaTime) {
      this.internalModel.update(this.deltaTime, this.elapsedTime)
      this.deltaTime = 0
    }

    const internalTransform = tempMatrix
      .copyFrom(renderer.globalUniforms.uniforms.projectionMatrix)
      .append(this.worldTransform)

    this.internalModel.updateTransform(internalTransform)
    this.internalModel.draw(renderer.gl)

    // reset WebGL state and texture bindings
    renderer.state.reset()
    renderer.texture.reset()
  }

  /**
   * Destroys the model and all related resources. This takes the same options and also
   * behaves the same as `PIXI.Container#destroy`.
   * @param options - Options parameter. A boolean will act as if all options
   *  have been set to that value
   * @param [options.children=false] - if set to true, all the children will have their destroy
   *  method called as well. `options` will be passed on to those calls.
   * @param [options.texture=false] - Only used for child Sprites if `options.children` is set to true
   *  Should it destroy the texture of the child sprite
   * @param [options.baseTexture=false] - Only used for child Sprites if `options.children` is set to true
   *  Should it destroy the base texture of the child sprite
   */
  destroy(options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }): void {
    this.emit('destroy')

    if (options?.texture) {
      this.textures.forEach((texture) => texture.destroy(options.baseTexture))
    }

    this.automator.destroy()
    this.internalModel.destroy()

    super.destroy(options)
  }
}
