# Contributing

Thanks for taking the time to contribute. This document covers the dev setup, test tiers, quality gates and conventions for v5.

## Setup

- **Node >= 20.19** (see `engines` in `package.json`)
- **Yarn 1.x** — the lockfile resolves against `registry.yarnpkg.com`; please don't regenerate it with a different registry

```bash
git clone https://github.com/alifeinbinary/tailwind-react-music-player.git
cd tailwind-react-music-player
yarn --frozen-lockfile
```

## Dev loop

```bash
yarn demo   # playground at http://localhost:8084 (playground/example.tsx)
```

Edit `playground/example.tsx` to exercise the prop you're changing. `yarn build:demo` produces the GitHub Pages bundle.

## Tests

Three tiers — pick the smallest one that covers your change:

| Command | What runs |
| --- | --- |
| `yarn test:unit` | Vitest `unit` project — jsdom + React Testing Library (`src/**/*.test.{ts,tsx}`) |
| `yarn test:browser` | Vitest `browser` project — real Chromium via `@vitest/browser` (`src/**/*.browser.test.{ts,tsx}`). Requires `yarn playwright install chromium` once |
| `yarn e2e` | Playwright visual + a11y specs against the playground. **Baselines are generated on Linux** — see `e2e/README.md` before regenerating |

`yarn test` runs both Vitest projects. Coverage: `yarn test:coverage` (unit project only).

## Quality gates

CI runs all of these — run them before opening a PR:

```bash
yarn lint            # eslint (flat config) + stylelint
yarn typecheck       # tsc --noEmit, app + build configs
yarn test:coverage   # thresholds: 90/85/90/90 global, 100% for src/core/**
yarn build           # vite lib build (ESM + d.ts) + tailwind styles.css
yarn size            # size-limit: dist/index.js ≤ 25 kB gz, dist/styles.css ≤ 8 kB gz
yarn check:package   # publint + attw
yarn smoke:import    # node ESM import of dist/index.js
yarn smoke:pack      # npm pack → install → typecheck tarball (scripts/smoke-pack.mjs)
```

`yarn prettier` (`prettier --check .`) must pass — lint-staged runs prettier on staged `*.{css,json,md,yml}` and eslint+prettier on `*.{ts,tsx}`.

## Code conventions

- **`src/types.ts` is the public API source of truth.** Every exported prop/type is re-exported through `src/index.ts`; update both together. `src/components/music-player.tsx` has a `satisfies`-checked prop split — add new UI prop keys to `UI_PROP_KEYS`.
- **Tailwind v4 with the `trmp` prefix.** All utilities in `className` strings are `trmp:`-prefixed. No Preflight, no global resets — scoped resets live in `src/styles/base.css` under `.trmp-root`.
- **`--trmp-*` tokens** in `src/styles/tokens.css` (`@theme static`) are public API: utilities emit `var(--trmp-*)` so consumer overrides work at runtime. Theme variants are token remaps on `[data-theme]`/`[data-layout]`, not selector overrides.
- **Semantic `trmp-*` classes** (`.trmp-icon-button`, `.trmp-toast`, `.trmp-cover`, …) are public API — always present alongside utilities, never rename or drop one.
- **No `rounded-full`** — it emits `calc(infinity * 1px)`; use `rounded-[50%]`. Other Tailwind gotchas are documented in `AGENTS.md`.
- **No `prop-types`** — types are compile-time only. No new runtime validators.
- **Icons are generated** — `yarn gen:icons` regenerates `src/components/icons/icons.tsx` from `lucide-static`. Edit the mapping in `scripts/gen-icons.ts`, never the generated file. `yarn gen:fixtures` regenerates the WAV fixtures in `src/test/fixtures/`.
- **Test placement** — colocated `*.test.ts(x)` for jsdom tests, `*.browser.test.ts(x)` for tests that need a real media element; shared helpers live in `src/test/`.

## Commits and PRs

- **Conventional Commits** — commitlint runs via husky (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, …). `feat!:`/`BREAKING CHANGE` bumps major.
- Keep PRs focused; include tests for behaviour changes and update `MIGRATION.md`/README when the public API changes.
- PR checklist:
  - [ ] `yarn lint`, `yarn typecheck`, `yarn test` green
  - [ ] coverage thresholds still pass (`yarn test:coverage`)
  - [ ] docs updated for public API changes (`src/types.ts`, README props table, MIGRATION.md)
  - [ ] new/changed semantic classes or tokens reflected in README
  - [ ] `yarn smoke:pack` passes if `files`/`exports`/`dist` output changed

## Releases

Fully automated via **semantic-release** on `master`/`next`. Versions come from conventional-commit analysis — **do not bump `version` manually** (the `5.0.0-alpha.0` in `package.json` is a placeholder for pre-1.0 tooling) and do not edit `CHANGELOG.md` by hand. The release workflow runs the full gate (lint, typecheck, unit + browser tests, build, `smoke:import`, `check:package`, `smoke:pack`) before `yarn release`.
