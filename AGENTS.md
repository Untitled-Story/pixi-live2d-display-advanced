# Repository Guidelines

## Project Structure & Module Organization
- `src/` – TypeScript sources for the PixiJS v8 Live2D plugin (core models, factories, utilities).
- `playground/` – Minimal Vite demo for manual checks only; keep production logic out.
- `docs/` – MkDocs sources; content lives in `docs/docs`.
- `scripts/` – Build/type/doc helpers (e.g., `build.mjs`, `gen-docs.js`).
- Generated artifacts: `dist/`, `types/` (do not edit directly). Cubism assets live in `core/` (fetched via setup).

## Build, Test, and Development Commands
- `npm run setup` – Fetch Cubism cores/submodules; required before builds/tests.
- `npm run check` – ESLint + `tsc --noEmit`; must be clean.
- `npm run build` – Bundle library outputs to `dist/`.
- `npm run type` – Emit bundled `.d.ts` into `types/`.
- `npm test` / `npm run test:u` – Vitest (update snapshots with `:u`).
- `npm run playground` – Start Vite dev server for manual verification.

## Coding Style & Naming Conventions
- TypeScript with strict typing; avoid `any`/casts to silence errors. No `@ts-ignore`.
- Explicit return types for public APIs; Pixi imports via `import { ... } from 'pixi.js'`.
- ESLint + Prettier formatting (2-space indent). Keep comments minimal and purposeful.
- Do not touch `cubism/` submodule code unless explicitly required.

## Testing Guidelines
- Framework: Vitest; browser-enabled tests live alongside sources (`*.test.ts`).
- Prefer deterministic checks; update snapshots intentionally via `npm run test:u`.
- Treat `npm run check` as mandatory before submitting changes.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subjects (e.g., “Fix motion blending edge case”).
- PRs should state intent/scope, confirm `npm run check` status, and note type-related decisions. Include screenshots/gifs for visual/playground changes when helpful.

## Security & Configuration Tips
- No network access assumed during tests/builds; ensure `npm run setup` has been executed locally.
- Do not commit generated outputs or Cubism binaries beyond `core/`.
- Use provided paths (`resolveURL`, settings helpers) to keep resource references consistent.
