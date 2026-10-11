# react-jinke-music-player

HTML5 music player component for React. Styles are compiled with
**Tailwind CSS v4** via PostCSS (see `src/styles/`).

## Build

```bash
# Node >= 17 requires the legacy OpenSSL provider for this old webpack 5
NODE_OPTIONS=--openssl-legacy-provider yarn build
```

- `yarn build:css` — compiles `src/styles/index.css` → `assets/index.css`
- `yarn build:js` — babel (lib/, es/) + webpack UMD bundle (dist/)
- `yarn demo` — webpack dev server on http://localhost:8084 (needs the same
  `NODE_OPTIONS` flag)
- `yarn test` — jest + enzyme
- `yarn lint` — eslint (src, __tests__) + stylelint (`{example,src}/**/*.css`)

## Styling

- Source styles live in `src/styles/*.css` (Tailwind + native CSS nesting +
  `@apply`). `index.css` is the entry; `theme.css` defines every theme token.
- Semantic class names (`.react-jinke-music-player-main`, `.audio-lists-panel`,
  `.music-player-panel`, ...) are the library's public styling API — do not
  rename them; tests and user overrides depend on them.
- All theme values are exposed as `--rjmp-*` CSS custom properties on `:root`
  in `theme.css`. End users theme the player by overriding those variables —
  keep that mechanism intact.
- `theme.css` values must remain plain values (no `var()` chains to other
  `--rjmp-*` tokens are fine — they resolve lazily, e.g. `--rjmp-lyric-color`).
- Light theme rules use `-light` suffixed tokens; mobile uses `-mobile`.

## Environment notes

- `yarn.lock` resolves against `registry.npmmirror.com` (the original
  `registry.npm.taobao.org` is defunct). If installs fail with certificate
  errors, check the registry in the lockfile.
- `postcss-loader` v5 requires `postcss.config.js` to export `plugins` as an
  **array**, not a function — a function config silently loads zero plugins.
