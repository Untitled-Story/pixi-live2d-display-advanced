# pixi-live2d-display-advanced

![NPM 版本](https://img.shields.io/npm/v/pixi-live2d-display-advanced?style=flat-square&label=version)
![Cubism 版本](https://img.shields.io/badge/Cubism-2/3/4-ff69b4?style=flat-square)

一款适用于 [PixiJS](https://github.com/pixijs/pixi.js) v7 的 Live2D 插件。

该项目为在网页端控制 Live2D 模型提供了**统一且简化的 API**。与官方 Live2D SDK 相比，本库使用更简便、稳定性更高且更易于维护。

与 [pixi-live2d-display-mulmotion](https://www.npmjs.com/package/pixi-live2d-display-mulmotion) 相比，该项目额外支持**播放动作的最后一帧**——这在**类 Project SEKAI（世界计划）项目**中尤为实用（此类项目需频繁重新应用动画）；同时，本项目采用 `@pixi/sound` 作为音频后端，修复了模型更新、显示异常等诸多问题。

## 功能特性

- 支持所有版本的 Live2D 模型（Cubism 2.1、3、4）
- 兼容 `PIXI.RenderTexture`（渲染纹理）与 `PIXI.Filter`（滤镜）
- 熟悉的 Pixi.js 风格变换 API：`position`（位置）、`scale`（缩放）、`rotation`（旋转）、`skew`（倾斜）、`anchor`（锚点）
- 自动交互功能：鼠标追踪、点击命中检测
- 相比官方框架，优化了动作预约逻辑
- 支持从上传文件或压缩包中加载模型（实验性功能）
- 完整的 TypeScript 类型定义
- 实时口型同步
- 支持同时播放多个动作
- 支持播放动作的最后一帧

## 依赖要求

- **PixiJS**：7.x 版本
- **Cubism 核心**：2.1 或 4 版本
- **浏览器**：需支持 WebGL 和 ES6 语法

## 示例演示

- [基础示例](#基础用法)
- [交互示例](https://codepen.io/guansss/pen/KKgXBOP/left?editors=0010)
- [渲染纹理与滤镜示例](https://codepen.io/guansss/pen/qBaMNQV/left?editors=1010)
- [在线 Live2D 查看器](https://guansss.github.io/live2d-viewer-web/)
- [并行动作示例](#并行动作)
- [播放动作最后一帧示例](#播放动作最后一帧)

文档资料：

- [用户指南](https://guansss.github.io/pixi-live2d-display)
- [API 参考](https://guansss.github.io/pixi-live2d-display/api/index.html)

## Cubism 运行时

Cubism 是 Live2D SDK 的官方名称。目前共有三个版本：**Cubism 2.1**、**Cubism 3** 和 **Cubism 4**（其中 Cubism 4 向下兼容 Cubism 3）。

本插件支持 **Cubism 2.1 和 Cubism 4**，可覆盖所有版本的 Live2D 模型。

### 加载 Cubism 核心文件

- **Cubism 4**：`live2dcubismcore.min.js`

  - 可从 [Cubism 4 SDK](https://www.live2d.com/download/cubism-sdk/download-web/) 下载
  - 也可使用此链接（[link](https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js)）_（不保证长期可用，请勿用于生产环境）_

- **Cubism 2.1**：`live2d.min.js`
  - 官方网站自 [2019 年 9 月 4 日](https://help.live2d.com/en/other/other_20/) 起不再提供该文件
  - 可在 [GitHub](https://github.com/dylanNew/live2d/tree/master/webgl/Live2D/lib) 上获取
  - 也可通过 [jsDelivr 内容分发网络](https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js) 获取

### 打包文件

本插件为不同 Cubism 版本提供了**独立的构建文件**：

- `cubism2.js` + `live2d.min.js` → 支持 Cubism 2.1 模型
- `cubism4.js` + `live2dcubismcore.min.js` → 支持 Cubism 3 和 4 模型
- `index.js` + 两种运行时 → 支持所有版本的模型

> [!Warning]
> 请勿同时使用 `cubism2.js` 和 `cubism4.js`。若需同时支持两种版本，请使用 `index.js`。

## 安装方式

通过 npm 安装：

```sh
npm install pixi-live2d-display-advanced
```

使用方式：

```ts
import { Live2DModel } from 'pixi-live2d-display-advanced'

// 仅支持 Cubism 2.1
import { Live2DModel } from 'pixi-live2d-display-advanced/cubism2'

// 仅支持 Cubism 4
import { Live2DModel } from 'pixi-live2d-display-advanced/cubism4'
```

## 基础用法

参考示例项目：[pixi-live2d-display-lipsync](https://github.com/RaSan147/pixi-live2d-display)

Cubism 4 模型会在首次加载时自动完成配置。若需自定义选项（如内存大小）或确保加载前完成配置，可手动调用一次 `configureCubism4()`。

```ts
import { Live2DModel, configureCubism4 } from 'pixi-live2d-display-advanced/cubism4'

// 配置 Cubism 运行时（仅需调用一次）
configureCubism4({
  memorySizeMB: 128 // 内存大小（单位：MB）
})

// 加载模型
const model = await Live2DModel.from('mymodel.model3.json')
app.stage.addChild(model)
```

## 并行动作

```ts
model.parallelMotion([
  { group: motion_group1, index: motion_index1, priority: MotionPriority.NORMAL },
  { group: motion_group2, index: motion_index2, priority: MotionPriority.NORMAL }
])
```

若需将动作与表情/声音同步：单个动作可使用 `model.motion` 或 `model.speak` 方法，其他动作可使用 `model.parallelMotion` 方法。每个动作项都拥有独立的优先级控制，其逻辑与 `model.motion` 一致。

## 播放动作最后一帧

单个动作：

```ts
await model.motionLastFrame('w-cute12-tilthead', 0)
```

多个动作：

```ts
await model.parallelLastFrame([
  { group: 'w-cute12-tilthead', index: 0 },
  { group: 'face_worry_01', index: 0 }
])
```

或使用手动并行动作管理器：

```ts
model.internalModel.extendParallelMotionManager(2)
const manager1 = model.internalModel.parallelMotionManager[0]!
const manager2 = model.internalModel.parallelMotionManager[1]!

manager1.playMotionLastFrame('w-cute12-tilthead', 0)
manager2.playMotionLastFrame('face_worry_01', 0)
```

以上两种方式效果相同——第一种是第二种的语法糖（简化写法）。
