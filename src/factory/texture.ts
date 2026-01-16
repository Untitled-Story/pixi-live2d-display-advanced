import type { Texture } from 'pixi.js'
import { Assets, loadTextures } from 'pixi.js'

export function createTexture(
  url: string,
  options: { crossOrigin?: string; preferCreateImageBitmap?: boolean } = {}
): Promise<Texture> {
  const config = loadTextures.config
  const previousCrossOrigin = config?.crossOrigin
  const previousPreferCreateImageBitmap = config?.preferCreateImageBitmap
  const previousPreferWorkers = config?.preferWorkers

  if (options.crossOrigin !== undefined && config) {
    config.crossOrigin = options.crossOrigin
  }
  if (options.preferCreateImageBitmap === false && config) {
    config.preferCreateImageBitmap = false
    config.preferWorkers = false
  }

  return Assets.load<Texture>(url)
    .catch((error: unknown) => {
      if (error instanceof Error) {
        throw error
      }

      throw new Error('Texture loading error', { cause: error })
    })
    .finally(() => {
      if (config) {
        config.crossOrigin = previousCrossOrigin ?? config.crossOrigin
        if (options.preferCreateImageBitmap === false) {
          config.preferCreateImageBitmap =
            previousPreferCreateImageBitmap ?? config.preferCreateImageBitmap
          config.preferWorkers = previousPreferWorkers ?? config.preferWorkers
        }
      }
    })
}
