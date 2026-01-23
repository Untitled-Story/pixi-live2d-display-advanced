# pixi-live2d-display-advanced

![NPM Version](https://img.shields.io/npm/v/pixi-live2d-display-advanced?style=flat-square&label=version)
![Cubism version](https://img.shields.io/badge/Cubism-2/3/4-ff69b4?style=flat-square)

**English (Current)** | [**简体中文**](README-ZH.md)

A Live2D plugin for [PixiJS](https://github.com/pixijs/pixi.js) v7.

> [!TIP]
> For PixiJS v8 support,
> please use [untitled-pixi-live2d-engine](https://github.com/Untitled-Story/untitled-pixi-live2d-engine).

This project provides a **unified and simplified API** for controlling Live2D models on the web.
Compared to the official Live2D SDKs, this library is easier to use, more reliable, and more maintainable.

Compared to [pixi-live2d-display-mulmotion](https://www.npmjs.com/package/pixi-live2d-display-mulmotion), this project
additionally supports **playing the last frame of motions**, which is especially useful in
**Project SEKAI-like projects** where animations need to be reapplied frequently, and uses `@pixi/sound` as the audio
backend, fixing many issues such as model update and display anomalies.

---

## Features

- Supports all versions of Live2D models (Cubism 2.1, 3, 4)
- Compatible with `PIXI.RenderTexture` and `PIXI.Filter`
- Familiar Pixi.js style transform API: `position`, `scale`, `rotation`, `skew`, `anchor`
- Automatic interaction: mouse tracking, hit detection on click
- Enhanced motion reservation logic compared to the official framework
- Load models from uploaded files or zip archives (experimental)
- Complete TypeScript type definitions
- Real-time lip sync
- Play multiple motions simultaneously
- Play the last frame of motions

---

## Requirements

- **PixiJS**: 7.x
- **Cubism Core**: 2.1 or 4
- **Browser**: WebGL, ES6

---

## Examples

- [Basic Example](#basic-usage)
- [Interaction Example](https://codepen.io/guansss/pen/KKgXBOP/left?editors=0010)
- [Render Texture & Filter Example](https://codepen.io/guansss/pen/qBaMNQV/left?editors=1010)
- [Live2D Viewer Online](https://guansss.github.io/live2d-viewer-web/)
- [Parallel Motions Example](#parallel-motions)
- [Play Motion Last Frame](#play-motion-last-frame)

Documentation:

- [User Guide](https://guansss.github.io/pixi-live2d-display)
- [API Reference](https://guansss.github.io/pixi-live2d-display/api/index.html)

---

## Cubism Runtime

Cubism is the official name of the Live2D SDK.
Currently, there are three versions: **Cubism 2.1**, **Cubism 3**, and **Cubism 4** (Cubism 4 is backward-compatible
with Cubism 3).

This plugin supports **Cubism 2.1 and Cubism 4**, covering all versions of Live2D models.

### Load Cubism Core

- **Cubism 4**: `live2dcubismcore.min.js`

  - Download from the [Cubism 4 SDK](https://www.live2d.com/download/cubism-sdk/download-web/)
  - Or use this [link](https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js) _(not guaranteed to be
    always available, do not use in production)_

- **Cubism 2.1**: `live2d.min.js`

  - The official site no longer provides it since [September 4, 2019](https://help.live2d.com/en/other/other_20/)
  - Available on [GitHub](https://github.com/dylanNew/live2d/tree/master/webgl/Live2D/lib)
  - Or via [jsDelivr CDN](https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js)

### Bundled Files

This plugin provides **separate builds** for different Cubism versions:

- `cubism2.js` + `live2d.min.js` → supports Cubism 2.1 models
- `cubism4.js` + `live2dcubismcore.min.js` → supports Cubism 3 & 4 models
- `index.js` + both runtimes → supports all versions

> [!WARNING]
> Do **not** use `cubism2.js` and `cubism4.js` together. Use `index.js` instead if you need both.

---

## Installation

Via npm:

```sh
npm install pixi-live2d-display-advanced
```

Usage:

```ts
import { Live2DModel } from 'pixi-live2d-display-advanced'

// Only Cubism 2.1
import { Live2DModel } from 'pixi-live2d-display-advanced/cubism2'

// Only Cubism 4
import { Live2DModel } from 'pixi-live2d-display-advanced/cubism4'
```

---

## Basic Usage

See example project: [pixi-live2d-display-lipsync](https://github.com/RaSan147/pixi-live2d-display)

Cubism 4 models are auto-configured when first encountered. Call `configureCubism4()` yourself if
you want to customize options (e.g., memory size) or ensure setup happens before any loading.

```ts
import { Live2DModel, configureCubism4 } from 'pixi-live2d-display-advanced/cubism4'

// Configure Cubism runtime (only needs to be called once)
configureCubism4({
  memorySizeMB: 128
})

// Load a model
const model = await Live2DModel.from('mymodel.model3.json')
app.stage.addChild(model)
```

---

## Parallel Motions

```ts
model.parallelMotion([
  { group: motion_group1, index: motion_index1, priority: MotionPriority.NORMAL },
  { group: motion_group2, index: motion_index2, priority: MotionPriority.NORMAL }
])
```

For syncing motions with expressions/sounds, use `model.motion` or `model.speak` for one motion, and
`model.parallelMotion` for others.
Each item has independent priority control, following the same logic as `model.motion`.

---

## Play Motion Last Frame

Single motion:

```ts
await model.motionLastFrame('w-cute12-tilthead', 0)
```

Multiple motions:

```ts
await model.parallelLastFrame([
  { group: 'w-cute12-tilthead', index: 0 },
  { group: 'face_worry_01', index: 0 }
])
```

Or with manual parallel motion managers:

```ts
model.internalModel.extendParallelMotionManager(2)
const manager1 = model.internalModel.parallelMotionManager[0]!
const manager2 = model.internalModel.parallelMotionManager[1]!

manager1.playMotionLastFrame('w-cute12-tilthead', 0)
manager2.playMotionLastFrame('face_worry_01', 0)
```

Both approaches are equivalent — the first is syntactic sugar for the second.
