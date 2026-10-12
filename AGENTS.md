# tailwind-react-music-player

HTML5 music player component for React. Written in **TypeScript**, built with **Vite**, tested with **Vitest** + Enzyme (React 16 adapter). Styles are compiled with **Tailwind CSS v4** (see `src/styles/`).

## Build

```bash
yarn build        # clean + vite lib build (ESM only + d.ts) + tailwind css
```

- `yarn build:bundle` — `vite build` → `dist/index.js` (ESM only, `"use client"` banner) + declarations via `vite-plugin-dts`
- `yarn build:css` — Tailwind CLI: `src/styles/index.css` → `dist/styles.css`
- `yarn demo` — Vite dev server on http://localhost:8084 (config: `playground/vite.config.ts`)
- `yarn build:demo` — production demo build → `playground/dist/` (base `/react-music-player/`; `/` on Netlify/Surge via env vars)
- `yarn test` — `vitest run` (jsdom, Enzyme, globals on; setup: `__tests__/setup.ts`)
- `yarn typecheck` — `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.build.json --noEmit`
- `yarn lint` — eslint (flat config `eslint.config.js`, whole repo) + stylelint (`{playground,src}/**/*.css`)
- `yarn size` — size-limit on `dist/index.js` + `dist/styles.css`
- `yarn check:package` — `publint` + `attw` (expected to report Phase-0-known issues; see MIGRATION plan)

The package is **ESM-only** (`"type": "module"`, `exports` map). All library output goes to `dist/`: `index.js`, `index.d.ts` (+ per-module `.d.ts`), `styles.css`. There is no CJS, no UMD, and no top-level `assets/` anymore — consumers import CSS via `tailwind-react-music-player/styles.css`.

## Codebase notes

- `src/types.ts` is the single source of truth for the public API types — it is re-exported from `src/index.tsx` (`export * from './types'` plus `export { default as locale }`, which replaces the old `lib/config/locale` deep import).
- Runtime `prop-types` are kept (`src/config/propTypes.ts`) — do not remove them; they are part of the runtime API for JS consumers.
- `name`/`musicSrc` on `TailwindReactMusicPlayerAudioListProps` are optional — the runtime and tests tolerate missing fields.
- Enzyme wrappers in tests are typed via `mount<TailwindReactMusicPlayer>(...)` to expose real state/instance types.
- jest-style globals are Vitest's (`vi.*`, `describe`, `it`, `expect` are global via `vitest/globals` in tsconfig).

## Styling

- v5 uses **Tailwind v4 with the `trmp` prefix** — every utility class in components is `trmp:`-prefixed (`trmp:flex`, `trmp:text-panel-text`), imported via `@import 'tailwindcss/utilities.css' prefix(trmp) source('..')` in `src/styles/index.css`. No Preflight, no `layer()` wrappers, no vendor CSS.
- Public design tokens live in `src/styles/tokens.css` inside `@theme static { … }` — they emit `--trmp-*` custom properties AND `trmp:` utilities (`--color-panel` → `trmp:bg-panel`, `--spacing-panel` → `trmp:h-panel`). Utilities reference `var(--trmp-*)` so runtime overrides work.
- Theming: consumers override `--trmp-*` variables. The light theme is a **token remap** on `.trmp-root[data-theme='light']`; mobile layout remaps on `.trmp-root[data-layout='mobile']` — not selector overrides.
- `src/styles/base.css` holds scoped resets — everything under `.trmp-root` (never global): box-sizing, button/ul resets, focus-visible outline, scrollbar, `input[type=range].trmp-range` native styling (filled portion via inline `--trmp-range-fill` percentage), `prefers-reduced-motion`.
- `src/styles/keyframes.css` holds the `trmp-*` keyframes referenced by `--animate-*` tokens.
- Semantic class names (`trmp-icon-button`, `trmp-toast`, `trmp-cover`, …) are the public styling API — always present on the element alongside utilities; do not rename.
- Note: `prefix()` namespaces theme variables and class names only; Tailwind's private `--tw-*` utility internals remain unprefixed (upstream limitation).
- The legacy `--rjmp-*` system (`theme.css` et al.) was removed in Phase 3a; legacy components' visuals are expected to be broken until 3b deletes them.

### Tailwind gotchas in this codebase

- **No `rounded-full`** — it emits `calc(infinity * 1px)`; use `rounded-[50%]` so the output stays a plain `50%`.
- `transition-[a,b_X_Y]` emits to `transition-property` only (invalid for multi-property shorthand) — use arbitrary-property `[transition:a,b_X_Y]` instead.
- `bg-(--x)`/`text-(--x)` var shorthands resolve to the utility's default type; for polymorphic `text-*` write `text-(color:--x)` or `text-(length:--x)` explicitly.
- `max-md:`/`max-[Npx]:` mean `width < N` — the original CSS used `max-width: 320px` (iPhone SE is exactly 320px), so those spots use `[@media_(max-width:320px)]:` variants instead.
- Tailwind v4 `scale-0`/`translate-*` emit standalone `scale`/`translate` properties — where the original used `transform:` so a keyframe can take over, use `transform-[scale(0)]` (see `.audio-lists-panel`).

## Environment notes

- Requires Node >= 20.19 (see `engines`). `yarn.lock` resolves against the public `registry.yarnpkg.com`.
- There is no `postcss.config.js` — Tailwind runs via the CLI (`build:css`) and `@tailwindcss/vite` (demo). Adding a PostCSS config would make Vite double-process CSS.
- The demo app lives in `playground/` (renamed from `example/`); docs images live in `docs/assets/`.
