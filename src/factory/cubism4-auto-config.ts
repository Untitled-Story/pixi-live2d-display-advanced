import { ModelSettings } from '@/cubism-common'

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

export async function autoConfigureCubism4IfNeeded(source: any): Promise<void> {
  const json = source instanceof ModelSettings ? (source as any).json : source

  if (!isCubism4JSON(json)) {
    return
  }

  const { ensureCubism4Configured } = await import('@/cubism4/setup')

  ensureCubism4Configured()
}
