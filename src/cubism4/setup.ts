import { logger, MBToByte } from '@/utils'
import type { CubismStartupOption } from '@cubism/live2dcubismframework'
import { CubismFramework, LogLevel } from '@cubism/live2dcubismframework'
import { registerCubism4Runtime } from '@/cubism4/factory'

let startupPromise: Promise<void>
let startupRetries = 20

let cubismMemory = 64
let registered = false

interface CubismConfig {
  options?: CubismStartupOption
  memorySizeMB?: number
}

export function configureCubism4(config: CubismConfig = {}) {
  cubismMemory = config.memorySizeMB ?? 64

  if (registered) {
    return
  }

  registerCubism4Runtime()

  registered = true
}

export function cubism4Ready(): Promise<void> {
  if (CubismFramework.isStarted()) {
    return Promise.resolve()
  }

  startupPromise ??= new Promise<void>((resolve, reject) => {
    function startUpWithRetry() {
      try {
        startUpCubism4()
        resolve()
      } catch (e) {
        startupRetries--

        if (startupRetries < 0) {
          const err = new Error('Failed to start up Cubism 4 framework.')
          ;(err as any).cause = e
          reject(err)
          return
        }

        logger.log('Cubism4', 'Startup failed, retrying 10ms later...')
        setTimeout(startUpWithRetry, 10)
      }
    }

    startUpWithRetry()
  })

  return startupPromise
}

export function startUpCubism4(options?: CubismStartupOption, memorySizeMB?: number) {
  options = Object.assign(
    {
      logFunction: console.log,
      loggingLevel: LogLevel.LogLevel_Verbose
    },
    options
  )

  const memory = memorySizeMB ?? cubismMemory

  CubismFramework.startUp(options)
  CubismFramework.initialize(MBToByte(memory))
}
