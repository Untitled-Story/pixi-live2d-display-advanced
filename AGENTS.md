# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the TypeScript implementation of the PixiJS Live2D plugin (core models, factories, utilities).
- `src/cubism-legacy/` houses Cubism 2 (CSM2) runtime integrations; the main Cubism 3/4/5 flow lives in `src/` and `src/cubism-common/`.
- `playground/` is a minimal Vite demo for manual checks only; keep production logic out.
- `core/` and `cubism/` hold Cubism SDK assets/submodules; treat them as vendored dependencies.
- Generated outputs include `dist/` (bundles) and `types/` (if generated). Do not edit by hand.

## Build, Test, and Development Commands

- `npm run setup`: fetch Cubism cores/submodules required for builds and tests.
- `npm run check`: run ESLint and `tsc --noEmit` (must be clean).
- `npm run build`: bundle library outputs to `dist/`.
- `npm run type`: emit bundled `.d.ts` files to `types/`.
- `npm test`: run Vitest.
- `npm run test:u`: update Vitest snapshots.
- `npm run playground`: start the Vite dev server for manual verification.

## Coding Style & Naming Conventions

- TypeScript with strict typing; avoid `any` and `@ts-ignore`.
- Use 2-space indentation via Prettier; lint with ESLint (`npm run check`).
- Public APIs should have explicit return types.
- Pixi imports should come from `pixi.js`.

## Testing Guidelines

- Framework: Vitest. Tests live alongside sources and use `*.test.ts`.
- Prefer deterministic tests; update snapshots intentionally with `npm run test:u`.

## Commit & Pull Request Guidelines

- Commits: concise, imperative subjects (e.g., “Fix motion blending edge case”).
- PRs: state intent and scope, mention `npm run check` results, and note type-related decisions.
- Include screenshots or GIFs for visual/playground changes when helpful.

## Security & Configuration Tips

- Assume no network access during tests/builds; run `npm run setup` beforehand.
- Do not modify `core/` or `cubism/` unless explicitly required.
- Use provided helpers (e.g., `resolveURL`) to keep resource references consistent.
