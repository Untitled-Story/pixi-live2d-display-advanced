# Repository Guidelines

## Project Structure & Module Organization

- `src/`: TypeScript sources for the PixiJS v8 Live2D plugin (core models, factories, utilities).
- `playground/`: Minimal demo bootstrap (Pixi Application, Live2DModel wiring) for manual testing.
- `docs/`: MkDocs documentation sources; `docs/docs` holds content.
- `scripts/`: Build/type/doc helper scripts (`build.mjs`, `gen-docs.js`, etc.).
- `core/`: Cubism core binaries (`live2d.min.js`, `live2dcubismcore.js`); ensure these are present via `npm run setup`.
- `cubism/`: Cubism SDK submodule; required for builds and tests.
- `dist/`, `types/`: Generated output; not edited directly.

## Build, Test, and Development Commands

- `npm run setup` – fetch Cubism cores/submodule content (required before build/test).
- `npm run playground` – start Vite dev server for the playground demo.
- `npm run build` – clean and bundle library outputs into `dist/`.
- `npm run type` – generate bundled `.d.ts` files into `types/`.
- `npm test` / `npm run test:u` – run Vitest (browser mode enabled); `:u` updates snapshots.
- `npm run lint` (`lint:fix`) – run ESLint with Prettier formatting rules.
- `npm run doc` – generate site docs; `serve-docs` to preview locally.

## Coding Style & Naming Conventions

- TypeScript (ESM) with strict typing; prefer explicit return types for public APIs.
- Follow project ESLint/Prettier config (2-space indent, semicolons per rules).
- Use Pixi v8 entrypoint imports (`import { Application, Ticker } from 'pixi.js'`) and avoid deep `@pixi/*` unless necessary.
- Keep comments minimal; explain non-obvious logic only.

## Testing Guidelines

- Framework: Vitest (browser-enabled). Tests reside alongside sources (`*.test.ts`).
- Prefer deterministic tests; use `npm run test` before submitting.
- For motion/graphics features, add minimal reproducible checks; keep snapshots updated intentionally (`test:u`).

## Commit & Pull Request Guidelines

- Commits: concise, imperative subject (e.g., “Fix texture upload on context loss”); group related changes.
- PRs: describe intent, major changes, and testing performed; link issues when available. Include screenshots/gifs for visual/playground changes when useful.

## Security & Configuration Tips

- Builds/tests require Cubism cores present; avoid committing core binaries or large assets beyond `core/`.
- No network access assumed during tests; keep demos referencing local assets or documented endpoints.
