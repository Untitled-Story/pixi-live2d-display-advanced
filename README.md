# pixi-live2d-display-advanced

![NPM Version](https://img.shields.io/npm/v/pixi-live2d-display-advanced?style=flat-square&label=version)
![Cubism version](https://img.shields.io/badge/Cubism-2/3/4/5-ff69b4?style=flat-square)

A Live2D plugin for [PixiJS](https://github.com/pixijs/pixi.js) v8

This project aims to be a universal Live2D framework for the web platform.
Since the official Live2D frameworks are very complex and unreliable, this project rewrites them to provide a unified and simple API,
allowing you to control Live2D models at a high level without needing to understand the internals.

Compared to [pixi-live2d-display-mulmotion](https://www.npmjs.com/package/pixi-live2d-display-mulmotion), this project adds support for
playing the last frame of motions. In Project SEKAI-like projects, this greatly shortens the time to reapply animations.

Additionally, this branch refactors some of the original code, which may improve performance in some areas, but most importantly greatly increases code readability and maintainability.

## Features

- Supports all versions of Live2D models
- Supports PIXI.RenderTexture and PIXI.Filter
- Pixi.js style transform API: position, scale, rotation, skew, anchor
- Automatic interaction: mouse tracking, hit detection on click
- Better motion reservation logic than the official framework
- Load from uploaded files or zip files (experimental)
- Complete type definitions - we all love types!
- Real-time lip sync
- Play multiple motions simultaneously
- Play the last frame of motions

## Requirements

- PixiJS: 8.x
- Cubism core: 2.1 or 5
- Browser: WebGL, ES6

## Examples

- [Basic Example](https://codepen.io/guansss/pen/oNzoNoz/left?editors=1010)
- [Interaction Example](https://codepen.io/guansss/pen/KKgXBOP/left?editors=0010)
- [Render Texture & Filter Example](https://codepen.io/guansss/pen/qBaMNQV/left?editors=1010)
- [Live2D Viewer Online](https://guansss.github.io/live2d-viewer-web/)
- [Parallel Motions Example](#parallel-motions)
- [Play Motion Last Frame](#play-motion-last-frame)

## Documentation

- [Documentation](https://guansss.github.io/pixi-live2d-display) (No Chinese translation available yet)
- [API Docs](https://guansss.github.io/pixi-live2d-display/api/index.html)

## Cubism

Cubism is the name of the Live2D SDK. There are currently multiple versions: Cubism 2.1 and the modern runtime (Cubism 3/4/5). Cubism 4/5 is compatible with Cubism 3 models.

This plugin ships a legacy build for Cubism 2.1 and a modern build for Cubism 3/4/5, covering all versions of Live2D models.

### Cubism Core

Before using this plugin, you need to load the Cubism runtime, also known as Cubism Core.

For Cubism 3, 4, 5, load `live2dcubismcore.min.js`.
You can extract it from the [Cubism  SDK](https://www.live2d.com/download/cubism-sdk/download-web/),
or directly reference [this link](https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js)
(_Note: this link may occasionally be unavailable, do not use it in production!_)

For Cubism 2.1, load `live2d.min.js`. [Since September 4, 2019](https://help.live2d.com/en/other/other_20/),
the official website no longer provides this version of the SDK, but you can find it [here](https://github.com/dylanNew/live2d/tree/master/webgl/Live2D/lib),
or use this [CDN link](https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js).

### Separate Bundled Files

This plugin provides separate bundled files for each Cubism runtime to reduce the file size when you only need one version.

Specifically, there is a `cubism-legacy.js` for Cubism 2.1 and a `cubism.js` for the modern runtime, plus a combined `index.js` that supports both.

**Note:** If you want to support both Cubism 2.1 and the modern runtime, please use `index.js` and _do not use_ `cubism-legacy.js` and `cubism.js` together.

To be more clear, here are the ways to use these files:

- Use `cubism-legacy.js` + `live2d.min.js` to support Cubism 2.1 models
- Use `cubism.js` + `live2dcubismcore.min.js` to support Cubism 3/4/5 models
- Use `index.js` + `live2d.min.js` + `live2dcubismcore.min.js` to support all versions of models

## Installation

### Via npm

```sh
npm install pixi-live2d-display-advanced
```

```js
import { Live2DModel } from 'pixi-live2d-display-advanced'

// If you only need Cubism 2.1
import { Live2DModel } from 'pixi-live2d-display-advanced/cubism-legacy'

// If you only need the modern runtime (Cubism 3/4/5)
import { Live2DModel } from 'pixi-live2d-display-advanced/cubism'
```

## Basic Usage

See here: [pixi-live2d-display-lipsync](https://github.com/RaSan147/pixi-live2d-display)

## Parallel Motions

```ts
model.parallelMotion([
  { group: motion_group1, index: motion_index1, priority: MotionPriority.NORMAL },
  { group: motion_group2, index: motion_index2, priority: MotionPriority.NORMAL }
])
```

If you need to play expressions, sounds, etc. in sync, use `model.motion`/`model.speak` to play one of the motions, and use `model.parallelMotion` for the other motions.
Each item in the list (by index) has independent priority control, following the same logic as `model.motion`.

## Play Motion Last Frame

For a single motion, you can simply do:

```ts
await model.motionLastFrame('w-cute12-tilthead', 0)
```

For multiple motions, use:

```ts
await model.parallelLastFrame([
  { group: 'w-cute12-tilthead', index: 0 },
  { group: 'face_worry_01', index: 0 }
])
```

Or:

```ts
model.internalModel.extendParallelMotionManager(2)
const manager1 = model.internalModel.parallelMotionManager[0]!
const manager2 = model.internalModel.parallelMotionManager[1]!
manager1.playMotionLastFrame('w-cute12-tilthead', 0)
manager2.playMotionLastFrame('face_worry_01', 0)
```

Essentially, these two approaches are equivalent. The first usage is just syntactic sugar for the second.

The project now targets pixi.js v8 by default.

# For more documentation, please refer to: [Documentation](https://guansss.github.io/pixi-live2d-display/)
