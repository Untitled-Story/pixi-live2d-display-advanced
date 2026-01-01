import * as CubismFrameworkConfig from '@cubism/cubismframeworkconfig'

const LOG_LEVEL_VERBOSE = 0
const LOG_LEVEL_WARNING = 1
const LOG_LEVEL_ERROR = 2
const LOG_LEVEL_NONE = 999

/**
 * Global configs.
 */
export const config = {
  LOG_LEVEL_VERBOSE,
  LOG_LEVEL_WARNING,
  LOG_LEVEL_ERROR,
  LOG_LEVEL_NONE,

  /**
   * Global log level.
   * @default config.LOG_LEVEL_WARNING
   */
  logLevel: __DEV__ ? LOG_LEVEL_VERBOSE : LOG_LEVEL_WARNING,

  /**
   * Enabling sound for motions.
   */
  sound: true,

  /**
   * fftSize for sound analyzer for lipsync.
   * Must be a power of 2 between 2^5 and 2^15, so one of: 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, and 32768.
   * @default 512
   */
  fftSize: 512,

  /**
   * Deferring motion and corresponding sound until both are loaded.
   */
  motionSync: true,

  /**
   * Default fading duration for motions without such value specified.
   */
  motionFadingDuration: 500,

  /**
   * Default fading duration for idle motions without such value specified.
   */
  idleMotionFadingDuration: 2000,

  /**
   * Default fading duration for expressions without such value specified.
   */
  expressionFadingDuration: 500,

  /**
   * If false, expression will be reset to default when playing non-idle motions.
   */
  preserveExpressionOnMotion: true,

  cubism4: CubismFrameworkConfig
}

/**
 * Consistent with the `version` in package.json.
 */
export const VERSION = __VERSION__
