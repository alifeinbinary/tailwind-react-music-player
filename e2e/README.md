# E2E tests (Playwright)

Two specs run against the playground demo (`yarn demo`, auto-started via `webServer` in `playwright.config.ts`):

- `visual.spec.ts` — screenshot comparisons of every player state (mini/full × dark/light × playlist/lyric/glass, desktop + mobile).
- `a11y.spec.ts` — full-page `@axe-core/playwright` scans (WCAG 2.0/2.1 A+AA) in each state, plus keyboard-only walkthroughs.

```bash
yarn e2e          # run both projects (chromium-desktop, chromium-mobile)
yarn e2e:a11y     # axe scans only
yarn e2e:update   # regenerate baselines for the CURRENT platform
```

## Screenshot baselines

Baselines live in `__screenshots__/<project>/visual.spec.ts/` and were generated on **Linux** so they match CI (Ubuntu) byte-for-byte. macOS and Windows render fonts/subpixels differently, so a locally-generated baseline will fail in CI.

To regenerate after an intentional visual change, run the suite inside the official Playwright image (match the version in `package.json`):

```bash
docker run --rm -v "$PWD":/work -w /work \
  mcr.microsoft.com/playwright:v1.64.0-noble \
  bash -c "yarn --frozen-lockfile && yarn playwright test --update-snapshots"
```

On non-Linux hosts, `visual.spec.ts` skips a state only when its baseline file is missing — committed Linux baselines still run and will diff against local rendering, which is expected. CI is the visual gate.
