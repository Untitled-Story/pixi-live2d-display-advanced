import { ModelSettings } from '@/cubism-common'
import type { JSONObject } from '@/types/helpers'
import { logger } from '@/utils'

const TAG = 'Cubism4AutoConfig'

function isCubism4JSON(json: any): boolean {
  if (!json || typeof json !== 'object') {
    return false
  }

  const refs = json.FileReferences

  return (
    !!refs &&
    typeof refs.Moc === 'string' &&
    Array.isArray(refs.Textures) &&
    refs.Textures.every((item: any) => typeof item === 'string')
  )
}

/**
 * Autoconfigures the Cubism4 runtime when a Cubism4 settings JSON is detected.
 * Accepts either raw settings JSON or a ModelSettings instance.
 */
export async function autoConfigureCubism4IfNeeded(
  source: ModelSettings | JSONObject
): Promise<void> {
  const json = source instanceof ModelSettings ? source.json : source

  if (!isCubism4JSON(json)) {
    return
  }

  try {
    const { ensureCubism4Configured } = await import('@/cubism4/setup')

    ensureCubism4Configured()
  } catch (err) {
    logger.warn(TAG, 'Failed to auto-configure Cubism4 runtime.', err)
    throw err
  }
}
