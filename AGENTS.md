# react-jinke-music-player

HTML5 music player component for React. Styles are compiled with **Tailwind CSS v4** via PostCSS (see `src/styles/`).

## Build

```bash
# Node >= 17 requires the legacy OpenSSL provider for this old webpack 5
NODE_OPTIONS=--openssl-legacy-provider yarn build
```

- `yarn build:css` — compiles `src/styles/index.css` → `assets/index.css`
- `yarn build:js` — babel (lib/, es/) + webpack UMD bundle (dist/)
- `yarn demo` — webpack dev server on http://localhost:8084 (needs the same `NODE_OPTIONS` flag)
- `yarn test` — jest + enzyme
- `yarn lint` — eslint (src, **tests**) + stylelint (`{example,src}/**/*.css`)

## Styling

- Layout/spacing/typography lives in **Tailwind utility classes inside component `className`s** (`src/**/*.js`, scanned via `source('..')` on the utilities import). The CSS files keep only what utilities can't express: keyframes, pseudo-elements, element selectors (`svg`, `ul`, `*`), rc-slider/rc-switch overrides, ancestor-scoped rules (`.player-content > .destroy-btn`, `.music-player .destroy-btn`), and the `.light-theme` / mobile `.audio-item` override layers.
- Semantic class names (`.react-jinke-music-player-main`, `.audio-lists-panel`, `.music-player-panel`, ...) are the library's public styling API — they stay on elements alongside utilities; do not rename them; tests and user overrides depend on them.
- All theme values are exposed as `--rjmp-*` CSS custom properties on `:root` in `theme.css`. End users theme the player by overriding those variables — keep that mechanism intact.
- `theme.css` values must remain plain values (no `var()` chains to other `--rjmp-*` tokens are fine — they resolve lazily, e.g. `--rjmp-lyric-color`).
- Light theme rules use `-light` suffixed tokens; mobile uses `-mobile`.

### Tailwind gotchas in this codebase

- **No `rounded-full`** — it emits `calc(infinity * 1px)`, which crashes the old `postcss-calc` inside `css-minimizer-webpack-plugin` (obscure `DataCloneError` in webpack). Use `rounded-[50%]`.
- `transition-[a,b_X_Y]` emits to `transition-property` only (invalid for multi-property shorthand) — use arbitrary-property `[transition:a,b_X_Y]` instead.
- `bg-(--x)`/`text-(--x)` var shorthands resolve to the utility's default type; for polymorphic `text-*` write `text-(color:--x)` or `text-(length:--x)` explicitly.
- `max-md:`/`max-[Npx]:` mean `width < N` — the original CSS used `max-width: 320px` (iPhone SE is exactly 320px), so those spots use `[@media_(max-width:320px)]:` variants instead.
- Tailwind v4 `scale-0`/`translate-*` emit standalone `scale`/`translate` properties — where the original used `transform:` so a keyframe can take over, use `transform-[scale(0)]` (see `.audio-lists-panel`).

## Environment notes

- `yarn.lock` resolves against `registry.npmmirror.com` (the original `registry.npm.taobao.org` is defunct). If installs fail with certificate errors, check the registry in the lockfile.
- `postcss-loader` v5 requires `postcss.config.js` to export `plugins` as an **array**, not a function — a function config silently loads zero plugins.
