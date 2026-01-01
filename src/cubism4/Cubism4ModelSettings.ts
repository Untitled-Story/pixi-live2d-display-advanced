import { ModelSettings } from '@/cubism-common/ModelSettings'
import { applyMixins } from '@/utils'
import type { CubismSpec } from '@cubism/CubismSpec'
import { CubismModelSettingJson } from '@cubism/cubismmodelsettingjson'

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging, @typescript-eslint/no-empty-object-type
export interface Cubism4ModelSettings extends CubismModelSettingJson {}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class Cubism4ModelSettings extends ModelSettings {
  declare json: CubismSpec.ModelJSON

  moc!: string
  textures!: string[]
  layout?: Record<string, number>
  hitAreas?: { Id: string; Name: string }[]
  expressions?: { Name?: string; File?: string }[]
  motions?: Record<string, { File: string; Sound?: string }[]>

  // methods mixed in from CubismModelSettingJson (stubs for type checking)
  getEyeBlinkParameterCount?: () => number
  getEyeBlinkParameterId?: (index: number) => { getString?: () => { s: string } }
  getLipSyncParameterCount?: () => number
  getLipSyncParameterId?: (index: number) => { getString?: () => { s: string } }

  static isValidJSON(json: any): json is CubismSpec.ModelJSON {
    return (
      !!json?.FileReferences &&
      typeof json.FileReferences.Moc === 'string' &&
      json.FileReferences.Textures?.length > 0 &&
      // textures must be an array of strings
      json.FileReferences.Textures.every((item: any) => typeof item === 'string')
    )
  }

  constructor(json: CubismSpec.ModelJSON & { url: string }) {
    super(json)

    if (!Cubism4ModelSettings.isValidJSON(json)) {
      throw new TypeError('Invalid JSON.')
    }

    // this doesn't seem to be allowed in ES6 and above, calling it will cause an error:
    // "Class constructor CubismModelSettingsJson cannot be invoked without 'new'"
    //
    // CubismModelSettingsJson.call(this, json);

    const buffer = new TextEncoder().encode(JSON.stringify(json)).buffer

    Object.assign(this, new CubismModelSettingJson(buffer, buffer.byteLength))

    // populate plain fields expected by ModelSettings consumers
    this.moc = json.FileReferences.Moc
    this.textures = [...json.FileReferences.Textures]
    this.pose = json.FileReferences.Pose
    this.physics = json.FileReferences.Physics
    this.expressions = json.FileReferences.Expressions
    this.motions = json.Motions
    this.layout = json.Layout
    this.hitAreas = json.HitAreas
  }

  replaceFiles(replace: (file: string, path: string) => string) {
    super.replaceFiles(replace)

    if (this.motions) {
      for (const [group, motions] of Object.entries(this.motions)) {
        for (let i = 0; i < motions.length; i++) {
          const motion = motions[i]

          if (!motion?.File) {
            continue
          }

          motion.File = replace(motion.File, `motions.${group}[${i}].File`)

          if (motion.Sound) {
            motion.Sound = replace(motion.Sound, `motions.${group}[${i}].Sound`)
          }
        }
      }
    }

    if (this.expressions) {
      for (let i = 0; i < this.expressions.length; i++) {
        const expression = this.expressions[i]
        if (!expression?.File) continue

        expression.File = replace(expression.File, `expressions[${i}].File`)
      }
    }
  }

  getEyeBlinkParameters(): string[] {
    const parameters: string[] = []
    const count = this.getEyeBlinkParameterCount?.() ?? 0

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const id = this.getEyeBlinkParameterId?.(i)
        if (id?.getString) {
          parameters.push(id.getString().s)
        }
      }
    } else if (Array.isArray((this.json as any).Groups)) {
      for (const group of (this.json as any).Groups) {
        if (group?.Name === 'EyeBlink' && Array.isArray(group.Ids)) {
          for (const entry of group.Ids) {
            if (typeof entry.Id === 'string') {
              parameters.push(entry.Id)
            } else if (typeof entry === 'string') {
              parameters.push(entry)
            }
          }
        }
      }
    }

    return parameters
  }

  getLipSyncParameters(): string[] {
    const parameters: string[] = []
    const count = this.getLipSyncParameterCount?.() ?? 0

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const id = this.getLipSyncParameterId?.(i)
        if (id?.getString) {
          parameters.push(id.getString().s)
        }
      }
    } else if (Array.isArray((this.json as any).Groups)) {
      for (const group of (this.json as any).Groups) {
        if (group?.Name === 'LipSync' && Array.isArray(group.Ids)) {
          for (const entry of group.Ids) {
            if (typeof entry.Id === 'string') {
              parameters.push(entry.Id)
            } else if (typeof entry === 'string') {
              parameters.push(entry)
            }
          }
        }
      }
    }

    return parameters
  }
}

applyMixins(Cubism4ModelSettings, [CubismModelSettingJson])
