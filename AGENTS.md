# tailwind-react-music-player

Accessible, themeable HTML5 music player component for React 19. Written in **TypeScript**, built with **Vite** (ESM-only lib build), tested with **Vitest** (jsdom + real-browser projects) and **Playwright**. Styles are compiled with **Tailwind CSS v4** using the `trmp` prefix (see `src/styles/`).

## Layout

```
src/
  index.ts          package entry — default export MusicPlayer + named exports
  types.ts          public API source of truth (MusicPlayerProps, AudioTrack, …)
  constants.ts      PLAY_MODES/THEMES/PLAYER_MODES/MEDIA_QUERY/TIMING/PERSIST_KEY
  core/             framework-free modules: playlist, lyric-parser, download,
                    volume-fade (slider↔gain), persistence, media-session, format
  hooks/            useMusicPlayer (headless orchestrator) + focused hooks:
                    audio-source, audio-events, playback-events, playlist-sync,
                    player-actions, controllable-state, persisted-state,
                    media-session, system-theme, volume-fade, lyric-sync,
                    media-query, sortable, download, keyboard-shortcuts
  components/       music-player.tsx (shell + portal + context) and the UI:
                    desktop-panel, mobile-panel, mini-controller, playlist-panel,
                    progress-bar, volume-control, transport, lyric-overlay,
                    play-mode-button, controls/, icons/ (generated), player-context
  i18n/             en_US, en_GB, zh_CN + createLocale/resolveLocale
  styles/           index.css (tailwind entry), tokens.css (@theme), base.css
                    (scoped resets), keyframes.css
  test/             shared setup + render helpers + WAV fixtures (generated)
src/types/          ambient .d.ts (sortablejs modular declaration)
e2e/                Playwright visual + a11y specs, Linux baselines (see e2e/README.md)
playground/         Vite demo app (was example/ in v4)
scripts/            gen-icons.ts, gen-fixtures.ts, smoke-pack.mjs
```

## Commands

```bash
yarn demo            # playground dev server on http://localhost:8084
yarn build           # clean + vite lib build (ESM + bundled d.ts) + tailwind css
yarn test            # BOTH vitest projects (unit + browser)
yarn test:unit       # jsdom project: src/**/*.test.{ts,tsx}
yarn test:browser    # real Chromium project: src/**/*.browser.test.{ts,tsx}
                     # needs `yarn playwright install chromium` once
yarn e2e             # Playwright specs; baselines are Linux-only — read e2e/README.md
yarn test:coverage   # unit project with v8 thresholds (90/85/90/90; 100% src/core)
yarn typecheck       # tsc -p tsconfig.json + tsconfig.build.json, noEmit
yarn lint            # eslint . (flat config) + stylelint '{playground,src}/**/*.css'
yarn size            # size-limit on dist/index.js (≤25kB gz) + dist/styles.css (≤8kB gz)
yarn check:package   # publint + attw
yarn smoke:import    # node ESM import of dist/index.js
yarn smoke:pack      # npm pack → scratch install → typecheck tarball
yarn gen:icons       # regenerate src/components/icons/icons.tsx from lucide-static
yarn gen:fixtures    # regenerate src/test/fixtures/*.wav
yarn prettier        # prettier --check .
```

The package is **ESM-only** (`"type": "module"`, `exports` map). Output: `dist/index.js` (with `"use client"` banner), `dist/index.d.ts`, `dist/styles.css` (consumed via `tailwind-react-music-player/styles.css`). No CJS, no UMD, no `assets/` entry point. Peer deps: `react`/`react-dom` >= 19 — `MusicPlayer` takes `ref` as a plain prop.

## Public API

`src/types.ts` is the single source of truth — `MusicPlayerProps = UseMusicPlayerOptions & MusicPlayerUIProps`, plus `MusicPlayerHandle` (ref API), `AudioTrack`/`PlaylistItem`, `AudioInfo`, `MusicPlayerState`/`Actions`, `Locale`/`PlayerIcons`. `src/index.ts` re-exports `export type * from './types'` — keep prop docs in `types.ts`, not README.

When adding a `MusicPlayerUIProps` key you must also add it to `UI_PROP_KEYS` in `src/components/music-player.tsx` — a `satisfies` check makes it a compile error otherwise.

`useMusicPlayer` is the headless hook behind the component — same options object, returns `{ state, actions, audioRef, audioProps }`. Component state is controlled-or-uncontrolled via `prop`/`defaultProp`/`onPropChange` triples (`playIndex`, `playMode`, `theme`, `mode`, `volume`) — see `use-controllable-state.ts`.

## Styling

- **Tailwind v4 with the `trmp` prefix** — every utility in a `className` is `trmp:`-prefixed (`trmp:flex`, `trmp:text-panel-text`), imported via `@import 'tailwindcss/utilities.css' prefix(trmp) source('..')` in `src/styles/index.css`. No Preflight, no `layer()` wrappers, no vendor CSS.
- Public design tokens live in `src/styles/tokens.css` inside `@theme static { … }` — they emit `--trmp-*` custom properties AND `trmp:` utilities (`--color-panel` → `trmp:bg-panel`, `--spacing-panel` → `trmp:h-panel`). Utilities reference `var(--trmp-*)` so runtime overrides work.
- Theming: consumers override `--trmp-*` variables. The light theme is a **token remap** on `.trmp-root[data-theme='light']`; mobile remaps on `.trmp-root[data-layout='mobile']` — not selector overrides. `.trmp-root` also carries `data-mode` and `data-status`.
- `src/styles/base.css` holds scoped resets — everything under `.trmp-root` (never global): box-sizing, button/ul resets, focus-visible outline, scrollbar, `input[type=range].trmp-range` native styling (filled portion via inline `--trmp-range-fill` percentage), `prefers-reduced-motion`.
- `src/styles/keyframes.css` holds the `trmp-*` keyframes referenced by `--animate-*` tokens.
- Semantic class names (`trmp-root`, `trmp-panel`, `trmp-mini`, `trmp-mobile`, `trmp-playlist`, `trmp-lyric`, `trmp-toast`, `trmp-cover`, `trmp-icon-button`, `trmp-theme-switch`, `trmp-time`, `trmp-track-title`, `trmp-range`, `trmp-range-wrap`, `trmp-sortable-highlight`) are the **public styling API** — always present on the element alongside utilities; do not rename.
- Note: `prefix()` namespaces theme variables and class names only; Tailwind's private `--tw-*` utility internals remain unprefixed (upstream limitation).

### Tailwind gotchas in this codebase

- **No `rounded-full`** — it emits `border-radius: 3.40282e38px` (Tailwind's infinity sentinel); use `rounded-[50%]` so the output stays a plain `50%`.
- `transition-[a,b_X_Y]` emits to `transition-property` only (invalid for multi-property shorthand) — use arbitrary-property `[transition:a,b_X_Y]` instead.
- `bg-(--x)`/`text-(--x)` var shorthands resolve to the utility's default type; for polymorphic `text-*` write `text-(color:--x)` or `text-(length:--x)` explicitly.
- `max-md:`/`max-[Npx]:` mean `width < N` — the original CSS used `max-width: 320px` (iPhone SE is exactly 320px), so those spots use `[@media_(max-width:320px)]:` variants instead.
- Tailwind v4 `scale-0`/`translate-*` emit standalone `scale`/`translate` properties — where the original used `transform:` so a keyframe can take over, use `transform-[scale(0)]`.

## Tests

- Two Vitest projects in `vite.config.ts`: `unit` (jsdom, setup `src/test/setup.ts`, `*.test.{ts,tsx}`) and `browser` (`@vitest/browser` + Playwright Chromium with `--autoplay-policy=no-user-gesture-required`, `*.browser.test.{ts,tsx}`). Use the browser project for anything needing a real media element or real layout.
- jest-style globals are Vitest's (`vi.*`, `describe`, `it`, `expect` via `vitest/globals` in tsconfig). React Testing Library + `vitest-axe` + `fake-media.ts` helpers live in `src/test/`.
- Coverage thresholds are enforced (see `vite.config.ts`) — `src/core/**` must stay at 100%.
- `e2e/` runs against the playground via `webServer` in `playwright.config.ts`; screenshot baselines are Linux-generated — **do not regenerate on macOS/Windows** (see `e2e/README.md` for the Docker workflow).

## Conventions

- **No `prop-types`** — the runtime validators were removed in v5; TypeScript is the contract.
- `AudioTrack.name`/`singer` accept `ReactNode`; `musicSrc` may be a URL or `() => Promise<string>` for lazy resolution.
- Playlist identity is player-assigned `PlaylistItem.id`; matching on list updates is by `musicSrc` (`src/core/playlist.ts`).
- Volume props/state are slider-scale `0..1`; the gain applied to `audio.volume` is perceptual (`sliderToGain = v²`).
- `persist` writes a throttled snapshot to `localStorage` under `trmp:player` (`PERSIST_KEY`).
- Conventional commits are enforced by commitlint + husky; lint-staged runs eslint/prettier. Version + CHANGELOG are owned by semantic-release — never bump `version` or edit `CHANGELOG.md` manually.
- Generated files — `src/components/icons/icons.tsx` (`yarn gen:icons`) and `src/test/fixtures/*.wav` (`yarn gen:fixtures`) — edit the generator, not the output.

## Environment notes

- Requires Node >= 22.19 (`engines`). `yarn.lock` resolves against the public `registry.yarnpkg.com` — keep it that way.
- There is no `postcss.config.js` — Tailwind runs via the CLI (`build:css`) and `@tailwindcss/vite` (demo + browser tests). Adding a PostCSS config would make Vite double-process CSS.
- The demo app lives in `playground/`; its GH Pages base is `/tailwind-react-music-player/` (`/` on Netlify/Surge via env vars). Docs images live in `docs/assets/`.
- v4 → v5 breaking changes are documented in `MIGRATION.md`; CN.md still describes the v4 API (banner at the top says so).
