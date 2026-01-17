import { logger } from '@/utils'
import type { Option } from '@cubism/live2dcubismframework'
import { CubismFramework, LogLevel } from '@cubism/live2dcubismframework'

let startupPromise: Promise<void>
let startupRetries = 20

/**
 * Promises that the Cubism framework is ready to work.
 * @return Promise that resolves if the startup has succeeded, rejects if failed.
 */
export function cubismReady(): Promise<void> {
  if (CubismFramework.isStarted()) {
    return Promise.resolve()
  }

  startupPromise ??= new Promise<void>((resolve, reject) => {
    function startUpWithRetry() {
      try {
        startUpCubism()
        resolve()
      } catch (e) {
        startupRetries--

        if (startupRetries < 0) {
          reject(new Error('Failed to start up Cubism framework.', { cause: e }))
          return
        }

        logger.log('Cubism', 'Startup failed, retrying 10ms later...')

        setTimeout(startUpWithRetry, 10)
      }
    }

    startUpWithRetry()
  })

  return startupPromise
}

/**
 * Starts up the Cubism framework.
 */
export function startUpCubism(options?: Option) {
  const startupOptions: Option = {
    logFunction: console.log,
    loggingLevel: LogLevel.LogLevel_Verbose,
    ...options
  }

  CubismFramework.startUp(startupOptions)
  CubismFramework.initialize()
}
