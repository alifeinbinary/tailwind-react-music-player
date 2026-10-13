# tailwind-react-music-player

An accessible, themeable HTML5 music player component for React, styled with Tailwind CSS — with a headless `useMusicPlayer` hook if you want to bring your own UI.

[![npm version](https://img.shields.io/npm/v/tailwind-react-music-player.svg)](https://www.npmjs.com/package/tailwind-react-music-player) [![CI](https://github.com/alifeinbinary/tailwind-react-music-player/workflows/CI/badge.svg)](https://github.com/alifeinbinary/tailwind-react-music-player/actions) [![bundle size](https://img.shields.io/bundlephobia/minzip/tailwind-react-music-player)](https://bundlephobia.com/package/tailwind-react-music-player) [![license](https://img.shields.io/npm/l/tailwind-react-music-player.svg)](https://github.com/alifeinbinary/tailwind-react-music-player/blob/master/LICENCE) [![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://github.com/alifeinbinary/tailwind-react-music-player)

![demo](https://github.com/alifeinbinary/tailwind-react-music-player/blob/master/docs/assets/img/example.gif?raw=true)

**[Live demo](https://alifeinbinary.github.io/tailwind-react-music-player/)** — try the player in your browser before installing.

## Features

- Full player UI: mini controller, fixed bottom panel, mobile layout, playlist drawer, floating lyric overlay
- Headless `useMusicPlayer` hook — same engine, your own markup
- Accessible: labelled controls, keyboard shortcuts, focus management, reduced-motion support
- Themeable: `dark` / `light` / `auto` themes, runtime `--trmp-*` CSS custom properties, per-slot icon overrides
- Playlist management: drag-to-sort (SortableJS), remove, reorder, list updates that preserve the current track
- Lyrics: LRC parsing and sync (`parseLrc` is exported if you roll your own)
- Volume fade in/out, perceptual volume mapping, persistence to `localStorage`
- Media Session API integration (lock-screen / hardware-key controls)
- Typed end-to-end; the public API surface is `src/types.ts`

## Requirements

- **React >= 19** (`MusicPlayer` takes `ref` as a plain prop — a React 19 feature)
- **ESM-only** — no CJS or UMD build; CJS consumers must `import()` or go through a bundler
- **Node >= 22.19** for the build tooling (the published bundle has no runtime Node dependency)

## Install

```bash
yarn add tailwind-react-music-player
# or
npm install tailwind-react-music-player
```

```tsx
import MusicPlayer from 'tailwind-react-music-player'
import 'tailwind-react-music-player/styles.css' // required — styles are a separate entry point
```

## Quick start

```tsx
import MusicPlayer from 'tailwind-react-music-player'
import 'tailwind-react-music-player/styles.css'

const audioLists = [
  {
    name: 'Despacito',
    singer: 'Luis Fonsi',
    cover: 'https://example.com/cover.jpg',
    musicSrc: 'https://example.com/despacito.mp3',
    // musicSrc can also resolve lazily:
    // musicSrc: () => fetch('/api/sign').then((r) => r.text()),
    lyric: '[00:00.00]Line one of the lyric',
  },
]

export default function App() {
  return <MusicPlayer audioLists={audioLists} />
}
```

## Props

`MusicPlayerProps = UseMusicPlayerOptions & MusicPlayerUIProps` — the options below are also accepted directly by `useMusicPlayer`. `src/types.ts` is the source of truth.

### Playlist, playback and state

Most state can be **controlled** (`value` + `onChange`) or **uncontrolled** (`default*`).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `audioLists` | `readonly AudioTrack[]` | — | **Required.** The playlist. |
| `playIndex` | `number` | — | Controlled index of the playing track |
| `defaultPlayIndex` | `number` | `0` | Initial index (uncontrolled) |
| `onPlayIndexChange` | `(index: number) => void` | — | Fires when the index changes |
| `playMode` | `PlayMode` | — | Controlled play mode |
| `defaultPlayMode` | `PlayMode` | `'order'` | `'order' \| 'orderLoop' \| 'singleLoop' \| 'shufflePlay'` |
| `onPlayModeChange` | `(mode: PlayMode) => void` | — | Fires when the play mode changes |
| `theme` | `Theme` | — | Controlled theme |
| `defaultTheme` | `Theme` | `'dark'` | `'dark' \| 'light' \| 'auto'` (auto follows `prefers-color-scheme`) |
| `onThemeChange` | `(theme: Theme) => void` | — | Fires when the theme changes |
| `mode` | `PlayerMode` | — | Controlled layout mode |
| `defaultMode` | `PlayerMode` | `'mini'`¹ | `'mini' \| 'full'` |
| `onModeChange` | `(mode: PlayerMode) => void` | — | Fires when the mode changes |
| `volume` | `number` | — | Controlled volume, slider scale `0..1` (mapped to gain internally) |
| `defaultVolume` | `number` | `1` | Initial volume (uncontrolled) |
| `onVolumeChange` | `(volume: number) => void` | — | Fires when the volume changes |
| `autoPlay` | `boolean` | `true` | Play the first track on load (subject to browser gesture policy) |
| `preload` | `'auto' \| 'metadata' \| 'none'` | `'none'` | `preload` attribute on the `<audio>` element |
| `crossOrigin` | `'anonymous' \| 'use-credentials'` | — | `crossOrigin` attribute on the `<audio>` element |
| `skipOnError` | `boolean` | `true` | Skip to the next track on load/playback errors |
| `restartCurrentOnPrev` | `boolean` | `false` | Prev restarts the track when past the restart threshold |
| `preserveCurrentOnUpdate` | `boolean` | `false` | Keep the playing track across `audioLists` updates |
| `replaceListOnUpdate` | `boolean` | `false` | Replace the list on `audioLists` update instead of merging |
| `autoPlayOnListUpdate` | `boolean` | `false` | Auto-play when `audioLists` changes |
| `persist` | `boolean \| string` | `false` | Persist state to `localStorage`; `true` uses the default key, a string sets a custom key |
| `volumeFade` | `VolumeFadeOptions` | — | `{ fadeIn, fadeOut }` durations in ms (skipped on iOS) |
| `mobileMediaQuery` | `string \| null` | `(max-width: 768px) and (orientation: portrait)` | Media query that selects the mobile UI; `null` disables |
| `mediaSession` | `boolean` | `false` | Publish Media Session metadata and action handlers |
| `random` | `() => number` | `Math.random` | Injectable random source for shuffle (tests) |

¹ `<MusicPlayer>` defaults `defaultMode` to `'mini'`; bare `useMusicPlayer` defaults to `'full'`.

`AudioTrack`:

```ts
interface AudioTrack {
  name?: React.ReactNode
  singer?: React.ReactNode
  cover?: string
  musicSrc: string | (() => Promise<string>)
  lyric?: string
  duration?: number
}
```

### Callbacks

Every callback receives a unified `AudioInfo` payload (`track`, `index`, `tracks`, `currentTime`, `duration`, `volume`, `muted`, `paused`, `ended`, `readyState`, `networkState`, `playMode`, `currentLyric`).

| Prop | Signature | Description |
| --- | --- | --- |
| `onPlay` | `(info: AudioInfo) => void` | Playback started |
| `onPause` | `(info: AudioInfo) => void` | Playback paused |
| `onEnded` | `(info: AudioInfo) => void` | Track ended |
| `onError` | `(error: MediaError \| Error \| null, info: AudioInfo) => void` | Load/playback error |
| `onProgress` | `(info: AudioInfo) => void` | `timeupdate` progress |
| `onSeeked` | `(info: AudioInfo) => void` | Seek completed |
| `onAbort` | `(info: AudioInfo) => void` | Load aborted |
| `onTrackChange` | `(info: AudioInfo) => void` | Current track changed |
| `onTracksChange` | `(tracks: readonly PlaylistItem[], info: AudioInfo) => void` | Playlist contents changed |
| `onLyricChange` | `(line: string, index: number) => void` | Active lyric line changed |
| `onReload` | `(info: AudioInfo) => void` | Reload requested |
| `onBeforeDownload` | `(info: AudioInfo) => DownloadInfo \| Promise<DownloadInfo> \| void` | Return/resolve a `DownloadInfo` to customise the download; return nothing for the default `{ src, filename }` |
| `onDownload` | `(info: AudioInfo, download: DownloadInfo) => void` | Fires after the download resolves |
| `customDownloader` | `(download: DownloadInfo) => void` | Replaces the built-in download behaviour (`DownloadInfo` = `{ src, filename?, mimeType? }`) |

### UI props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | — | Extra class on the `.trmp-root` element |
| `style` | `React.CSSProperties` | — | Inline style on the root element |
| `container` | `HTMLElement \| (() => HTMLElement) \| null` | `document.body` | Portal target; `null` renders inline (no portal) |
| `locale` | `LocaleId \| Partial<Locale>` | `'en_US'` | Locale id or partial string overrides — see [Locales](#locales) |
| `icons` | `Partial<PlayerIcons>` | `defaultIcons` | Per-slot icon overrides — see [Icons](#icons) |
| `draggable` | `boolean` | `true` | Mini controller is draggable |
| `dragBounds` | `string \| DraggableBounds` | — | Drag constraint passed to `react-draggable` |
| `defaultPosition` | `{ top?, left?, right?, bottom? }` | `{ right: 30, bottom: 30 }` | Mini controller initial position |
| `allowModeToggle` | `boolean` | `true` | Allow switching `mini` ⇄ `full` |
| `responsive` | `boolean` | `true` | Switch to the mobile UI when `mobileMediaQuery` matches |
| `seekable` | `boolean` | `true` | Progress bar is interactive |
| `glassBackground` | `boolean` | `false` | Frosted-glass panel background |
| `hideEmptyCover` | `boolean` | `false` | Hide the cover when a track has none |
| `showMiniCover` | `boolean` | `true` | Show the cover in the mini controller |
| `showMiniProgress` | `boolean` | `false` | Circular progress ring on the mini controller |
| `showBuffered` | `boolean` | `true` | Show the buffered-progress bar |
| `showPlayButton` | `boolean` | `true` | Show the play/pause button |
| `showReload` | `boolean` | `true` | Show the reload button |
| `showDownload` | `boolean` | `true` | Show the download button |
| `showPlayMode` | `boolean` | `true` | Show the play-mode toggle |
| `showThemeSwitch` | `boolean` | `true` | Show the light/dark theme switch |
| `showLyric` | `boolean` | `false` | Show the lyric toggle (and enable the lyric overlay) |
| `showDestroy` | `boolean` | `false` | Show the destroy button |
| `removable` | `boolean` | `true` | Tracks can be removed from the playlist |
| `sortable` | `boolean \| SortableOptions` | `false` | Drag-to-sort the playlist; an object is forwarded to SortableJS |
| `keyboardShortcuts` | `boolean` | `false` | Enable keyboard shortcuts — see [Accessibility](#accessibility) |
| `playModeTipDuration` | `number` | `600` | How long the play-mode toast stays visible (ms) |
| `extraControls` | `React.ReactNode` | — | Custom content rendered into the controls row |
| `lyricClassName` | `string` | — | Extra class on the lyric overlay |
| `renderTrackTitle` | `(info: AudioInfo, isMobile: boolean) => ReactNode` | — | Custom title renderer (also used for the `<audio>` title) |
| `onCoverClick` | `(info: AudioInfo) => void` | — | Cover image clicked |
| `onPlaylistToggle` | `(open: boolean) => void` | — | Playlist drawer opened/closed |
| `onBeforeDestroy` | `(info: AudioInfo) => boolean \| void \| Promise<boolean \| void>` | — | Return/resolve `false` to cancel destruction |
| `onDestroyed` | `(info: AudioInfo) => void` | — | Player destroyed |

## Ref handle

`MusicPlayer` takes a React 19 `ref` prop exposing `MusicPlayerHandle`: every `MusicPlayerActions` method, the live `audio` element, and `destroy()`.

```tsx
import { useRef } from 'react'
import MusicPlayer, {
  type MusicPlayerHandle,
} from 'tailwind-react-music-player'

function App() {
  const playerRef = useRef<MusicPlayerHandle>(null)

  return (
    <>
      <MusicPlayer ref={playerRef} audioLists={audioLists} />
      <button onClick={() => playerRef.current?.togglePlay()}>toggle</button>
      <button onClick={() => playerRef.current?.seekBy(10)}>+10s</button>
    </>
  )
}
```

`MusicPlayerActions`: `play`, `pause`, `togglePlay`, `playIndex`, `playId`, `next`, `prev`, `reload`, `seek`, `seekBy`, `setVolume`, `volumeBy`, `toggleMute`, `setPlayMode`, `cyclePlayMode`, `setTheme`, `toggleTheme`, `setMode`, `toggleMode`, `removeTrack`, `clearTracks`, `reorderTracks`, `download`, `getAudioInfo`.

## Headless: `useMusicPlayer`

Build your own UI on the same engine. Render an `<audio>` element with `player.audioProps` and wire `player.state`/`player.actions` to your controls.

```tsx
import { useMusicPlayer } from 'tailwind-react-music-player'

function MyPlayer() {
  const { state, actions, audioProps } = useMusicPlayer({
    audioLists,
    onTrackChange: (info) => console.log('now playing', info.track?.name),
  })

  return (
    <div>
      <audio {...audioProps} />
      <p>
        {state.track?.name} — {state.status}
      </p>
      <button onClick={actions.prev}>prev</button>
      <button onClick={actions.togglePlay}>
        {state.status === 'playing' ? 'pause' : 'play'}
      </button>
      <button onClick={actions.next}>next</button>
      <input
        type="range"
        min={0}
        max={state.duration || 0}
        value={state.currentTime}
        onChange={(e) => actions.seek(e.target.valueAsNumber)}
      />
    </div>
  )
}
```

`useMusicPlayer(options)` returns `{ state, actions, audioRef, audioProps }` — see `MusicPlayerState`, `MusicPlayerActions` and `MusicPlayerAudioProps` in `src/types.ts`.

## Theming

The player renders under a `.trmp-root` element carrying `data-theme` (`dark` | `light`), `data-mode`, `data-layout` (`desktop` | `mobile`) and `data-status` attributes.

```tsx
<MusicPlayer theme="auto" /> // follows prefers-color-scheme
```

### CSS custom properties

Every design token is a `--trmp-*` variable you can override at runtime — globally, or scoped to a subtree:

```css
:root {
  --trmp-color-primary: #ff5500;
}
.my-player-scope {
  --trmp-color-panel: #1e1e2e;
}
```

| Variable | Default | Description |
| --- | --- | --- |
| `--trmp-color-primary` | `#31c27c` | Accent colour |
| `--trmp-color-primary-contrast` | `#05301c` | Text/icons on the accent |
| `--trmp-color-primary-hover` | primary + 15% white | Accent on hover |
| `--trmp-color-panel` | `rgb(0 0 0 / 75%)` | Panel background |
| `--trmp-color-panel-mobile` | `rgb(0 0 0 / 92%)` | Mobile panel background |
| `--trmp-color-panel-text` | `#fff` | Panel text |
| `--trmp-color-panel-muted` | `rgb(255 255 255 / 60%)` | Muted text / slider rail |
| `--trmp-color-controller` | `#e6e6e6` | Mini controller background |
| `--trmp-color-surface` | `#f7f8fa` | Scrollbar/button surface |
| `--trmp-color-list-item` | `rgb(0 0 0 / 10%)` | Playlist row background |
| `--trmp-color-list-item-active` | `rgb(0 0 0 / 35%)` | Row hover |
| `--trmp-color-list-item-playing` | `rgb(0 0 0 / 35%)` | Playing row |
| `--trmp-color-track` | `#fff` | Progress rail |
| `--trmp-color-track-buffered` | `rgb(0 0 0 / 11%)` | Buffered progress |
| `--trmp-color-lyric` | `var(--trmp-color-primary)` | Floating lyric colour |
| `--trmp-spacing-panel` | `80px` | Panel height |
| `--trmp-spacing-panel-header` | `50px` | Playlist header height |
| `--trmp-spacing-controller` | `80px` | Mini controller size |
| `--trmp-spacing-controller-mobile` | `60px` | Mini controller size (mobile) |
| `--trmp-spacing-playlist-w` / `--trmp-spacing-playlist-h` | `480px` / `410px` | Playlist drawer size |
| `--trmp-spacing-track-h` | `5px` | Progress bar height |
| `--trmp-radius-panel` | `4px` | Playlist corner radius |
| `--trmp-text-lyric` / `--trmp-text-lyric-mobile` | `36px` / `16px` | Floating lyric font size |
| `--trmp-ease-player` | `cubic-bezier(0.43, -0.1, 0.16, 1.1)` | Default easing |
| `--trmp-duration-player` | `350ms` | Default transition duration |
| `--trmp-shadow-panel` | `0 0 3px #403f3f` | Panel shadow |
| `--trmp-range-fill` | per-slider | Filled portion of each range input (set inline by the player) |

The `light` theme is a token remap on `.trmp-root[data-theme='light']`; the mobile layout remaps on `.trmp-root[data-layout='mobile']`. To customise a single theme, override tokens inside the corresponding selector:

```css
.trmp-root[data-theme='light'] {
  --trmp-color-primary: #7c3aed;
}
```

### Semantic class hooks

Stable `trmp-*` classes are part of the public styling API and always present alongside utility classes: `.trmp-root`, `.trmp-panel`, `.trmp-mobile`, `.trmp-mini`, `.trmp-playlist`, `.trmp-lyric`, `.trmp-toast`, `.trmp-cover`, `.trmp-icon-button`, `.trmp-theme-switch`, `.trmp-time`, `.trmp-track-title`, `.trmp-range-wrap`, `.trmp-range`, `.trmp-sortable-highlight`.

### Icons

`icons` accepts per-slot `ReactNode` overrides. Slots: `play`, `pause`, `prev`, `next`, `loading`, `volume`, `mute`, `download`, `reload`, `lyric`, `playlist`, `close`, `delete`, `minimize`, `destroy`, `order`, `orderLoop`, `singleLoop`, `shuffle`, `collapse`, `empty`, `controller`.

```tsx
<MusicPlayer icons={{ play: <MyPlayIcon />, playlist: <MyListIcon /> }} />
```

`defaultIcons` is exported if you want to wrap or inspect the defaults.

## Locales

Built-in locales: `en_US`, `en_GB`, `zh_CN` (all exported via `locales`). `locale` accepts an id or a partial override merged over `en_US`:

```tsx
<MusicPlayer locale="zh_CN" />
<MusicPlayer locale={{ play: 'Play now', emptyPlaylist: 'Nothing here yet' }} />
```

`createLocale(partial, base?)` and `resolveLocale(input)` are exported for reuse; the full string list is the `Locale` type in `src/i18n/types.ts`.

## Accessibility

- All controls are labelled (`aria-label`/`title`) and keyboard-reachable
- The theme switch is `role="switch"`; the playlist is a dialog with focus management; lyrics announce via an `aria-live` overlay
- `prefers-reduced-motion` collapses decorative animation

Enable keyboard shortcuts with `keyboardShortcuts`. They fire on `keydown` within the player (ignored from text fields and handled events):

| Key       | Action                |
| --------- | --------------------- |
| `Space`   | Play / pause          |
| `←` / `→` | Seek −5s / +5s        |
| `↑` / `↓` | Volume +0.1 / −0.1    |
| `m`       | Mute / unmute         |
| `n` / `p` | Next / previous track |

Playlist rows additionally support `Alt`+arrow keyboard reordering. `useKeyboardShortcuts` is exported if you want the same bindings in a headless UI.

## SSR

The module is SSR-importable — it ships a `"use client"` banner and touches `document` only inside effects. By default the component renders nothing until the portal target resolves after mount; pass `container={null}` to render inline without a portal.

## Migrating from v4

v5 is a full rewrite — React 19, hooks, ESM-only, new prop names and a new token system. See [MIGRATION.md](./MIGRATION.md).

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENCE)
