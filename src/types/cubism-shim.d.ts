export interface Motion {
  File: string
  FadeInTime?: number
  FadeOutTime?: number
  Sound?: string
}

export interface Expression {
  Name: string
  File: string
  FadeInTime?: number
  FadeOutTime?: number
}

export interface Group {
  Name: string
  Ids: Array<string | { Id: string }>
}

export interface HitArea {
  Name: string
  Id: string
}

export interface FileReferences {
  Moc: string
  Textures: string[]
  Physics?: string
  Pose?: string
  UserData?: string
  Expressions?: Expression[]
  Motions?: Record<string, Motion[]>
}

export interface ModelJSON {
  Version?: number
  Name?: string
  FileReferences: FileReferences
  Motions?: Record<string, Motion[]>
  Groups?: Group[]
  Layout?: Record<string, number>
  HitAreas?: HitArea[]
}
