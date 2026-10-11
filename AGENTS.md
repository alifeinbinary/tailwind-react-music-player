# react-jinke-music-player

HTML5 music player component for React. Written in **TypeScript**, built with **Vite**, tested with **Vitest** + Enzyme (React 16 adapter). Styles are compiled with **Tailwind CSS v4** (see `src/styles/`).

## Build

```bash
yarn build        # clean + vite lib build (ESM+CJS+d.ts) + vite UMD build + tailwind css
```

- `yarn build:bundle` — `vite build` → `dist/index.js` (ESM) + `dist/index.cjs` (CJS) + declarations via `vite-plugin-dts`
- `yarn build:umd` — `vite build --mode umd` → `dist/react-jinke-music-player.min.js` (UMD, global `ReactJkMusicPlayer`, externals: react/react-dom)
- `yarn build:css` — Tailwind CLI: `src/styles/index.css` → `assets/index.css`
- `yarn demo` — Vite dev server on http://localhost:8084 (config: `example/vite.config.ts`)
- `yarn build:demo` — production demo build → `example/dist/` (base `/react-music-player/`; `/` on Netlify/Surge via env vars)
- `yarn test` — `vitest run` (jsdom, Enzyme, globals on; setup: `__tests__/setup.ts`)
- `yarn typecheck` — `tsc --noEmit`
- `yarn lint` — eslint (`src`, `__tests__` — `.ts`/`.tsx`) + stylelint (`{example,src}/**/*.css`)

All library output goes to `dist/` — there is no `lib/` or `es/` anymore. Package entry points: `main` → `dist/index.cjs`, `module` → `dist/index.js`, `typings` → `dist/index.d.ts`, `unpkg` → the UMD bundle.

## Codebase notes

- `src/types.ts` is the single source of truth for the public API types — it is re-exported from `src/index.tsx` (`export * from './types'` plus `export { default as locale }`, which replaces the old `lib/config/locale` deep import).
- Runtime `prop-types` are kept (`src/config/propTypes.ts`) — do not remove them; they are part of the runtime API for JS consumers.
- `name`/`musicSrc` on `ReactJkMusicPlayerAudioListProps` are optional — the runtime and tests tolerate missing fields.
- Enzyme wrappers in tests are typed via `mount<ReactJkMusicPlayer>(...)` to expose real state/instance types.
- jest-style globals are Vitest's (`vi.*`, `describe`, `it`, `expect` are global via `vitest/globals` in tsconfig).

## Styling

- Layout/spacing/typography lives in **Tailwind utility classes inside component `className`s** (`src/**/*.tsx`, scanned via `source('..')` on the utilities import). The CSS files keep only what utilities can't express: keyframes, pseudo-elements, element selectors (`svg`, `ul`, `*`), rc-slider/rc-switch overrides, ancestor-scoped rules (`.player-content > .destroy-btn`, `.music-player .destroy-btn`), and the `.light-theme` / mobile `.audio-item` override layers.
- Semantic class names (`.react-jinke-music-player-main`, `.audio-lists-panel`, `.music-player-panel`, ...) are the library's public styling API — they stay on elements alongside utilities; do not rename them; tests and user overrides depend on them.
- All theme values are exposed as `--rjmp-*` CSS custom properties on `:root` in `theme.css`. End users theme the player by overriding those variables — keep that mechanism intact.
- `theme.css` values must remain plain values (no `var()` chains to other `--rjmp-*` tokens are fine — they resolve lazily, e.g. `--rjmp-lyric-color`).
- Light theme rules use `-light` suffixed tokens; mobile uses `-mobile`.

### Tailwind gotchas in this codebase

- **No `rounded-full`** — it emits `calc(infinity * 1px)`; use `rounded-[50%]` so the output stays a plain `50%`.
- `transition-[a,b_X_Y]` emits to `transition-property` only (invalid for multi-property shorthand) — use arbitrary-property `[transition:a,b_X_Y]` instead.
- `bg-(--x)`/`text-(--x)` var shorthands resolve to the utility's default type; for polymorphic `text-*` write `text-(color:--x)` or `text-(length:--x)` explicitly.
- `max-md:`/`max-[Npx]:` mean `width < N` — the original CSS used `max-width: 320px` (iPhone SE is exactly 320px), so those spots use `[@media_(max-width:320px)]:` variants instead.
- Tailwind v4 `scale-0`/`translate-*` emit standalone `scale`/`translate` properties — where the original used `transform:` so a keyframe can take over, use `transform-[scale(0)]` (see `.audio-lists-panel`).

## Environment notes

- `yarn.lock` resolves against `registry.npmmirror.com` (the original `registry.npm.taobao.org` is defunct). If installs fail with certificate errors, check the registry in the lockfile.
- There is no `postcss.config.js` — Tailwind runs via the CLI (`build:css`) and `@tailwindcss/vite` (demo). Adding a PostCSS config would make Vite double-process CSS.
- `bundlesize` resolves `brotli-size@4` via a Yarn `resolutions` entry — `brotli-size@0.1.0` pulls in `iltorb`, which cannot compile on modern Node.
