import type { Texture } from 'pixi.js'
import { Assets, loadTextures } from 'pixi.js'

export function createTexture(
  url: string,
  options: { crossOrigin?: string } = {}
): Promise<Texture> {
  const config = loadTextures.config
  const previousCrossOrigin = config?.crossOrigin

  if (options.crossOrigin !== undefined && config) {
    config.crossOrigin = options.crossOrigin
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
      }
    })
}
