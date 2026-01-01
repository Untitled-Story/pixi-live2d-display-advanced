import type { Texture } from 'pixi.js'
import { Assets, loadTextures } from 'pixi.js'

export function createTexture(
  url: string,
  options: { crossOrigin?: string } = {}
): Promise<Texture> {
  const previousCrossOrigin = loadTextures.config.crossOrigin

  if (options.crossOrigin !== undefined) {
    loadTextures.config.crossOrigin = options.crossOrigin as any
  }

  return Assets.load<Texture>(url)
    .catch((e) => {
      if (e instanceof Error) {
        throw e
      }

      const err = new Error('Texture loading error')
      ;(err as any).event = e

      throw err
    })
    .finally(() => {
      loadTextures.config.crossOrigin = previousCrossOrigin
    })
}
