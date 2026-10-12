# Migration guide: v4 → v5

v5 is a full rewrite: function components + hooks, React 19, ESM-only, Tailwind v4 with a `trmp` prefix, native `<input type="range">` controls (no `rc-slider`/`rc-switch`), no `prop-types`, and a ref-based imperative API. The public API surface is `src/types.ts` (`MusicPlayerProps = UseMusicPlayerOptions & MusicPlayerUIProps`).

## Requirements

- **React >= 19.** `MusicPlayer` takes `ref` as a plain prop, which only works on React 19. There is no forwardRef compatibility shim.
- **ESM-only.** `"type": "module"`, `exports` map, no CJS/UMD/`unpkg` build. CJS consumers must use `await import()` or go through a bundler.
- **CSS import path changed.** The compiled stylesheet moved from `assets/` into `dist/` and is exposed as a dedicated export:

  ```diff
  -import 'tailwind-react-music-player/assets/index.css'
  +import 'tailwind-react-music-player/styles.css'
  ```

  The separate `assets/index.module.css` variant no longer exists.

## Before / after

```diff
-// v4 — class component, instance methods via callback
-import TailwindReactMusicPlayer from 'tailwind-react-music-player'
-import 'tailwind-react-music-player/assets/index.css'
-
-<TailwindReactMusicPlayer
-  audioLists={lists}
-  getAudioInstance={(audio) => (this.audio = audio)}
-  getContainer={() => document.getElementById('player-root')}
-  onAudioPlay={(info) => console.log(info)}
-  remove={false}
-  spaceBar
-/>

+// v5 — ref handle, unified AudioInfo payload
+import MusicPlayer, { type MusicPlayerHandle } from 'tailwind-react-music-player'
+import 'tailwind-react-music-player/styles.css'
+
+const playerRef = useRef<MusicPlayerHandle>(null)
+
+<MusicPlayer
+  ref={playerRef}
+  audioLists={lists}
+  container={() => document.getElementById('player-root')}
+  onPlay={(info) => console.log(info)}
+  removable={false}
+  keyboardShortcuts
+/>
+// playerRef.current.audio — the live <audio> element
+// playerRef.current.togglePlay() / .seek(30) / .next() / .destroy()
```

## Instance access

- `getAudioInstance(fn)` → pass a `ref`. `MusicPlayerHandle` exposes the element as `.audio` plus all `MusicPlayerActions` (`play`, `pause`, `togglePlay`, `next`, `prev`, `seek`, `seekBy`, `setVolume`, `toggleMute`, `cyclePlayMode`, `toggleTheme`, `toggleMode`, `removeTrack`, `clearTracks`, `reorderTracks`, `download`, `getAudioInfo`, …) and `destroy()`.
- v4 class-instance methods are all reachable through the handle; there is no `this`.

## Renamed props

| v4 | v5 |
| --- | --- |
| `remove` | `removable` |
| `drag` | `draggable` |
| `bounds` | `dragBounds` |
| `toggleMode` | `allowModeToggle` |
| `seeked` | `seekable` |
| `glassBg` | `glassBackground` |
| `autoHiddenCover` | `hideEmptyCover` |
| `showMiniModeCover` | `showMiniCover` |
| `showMiniProcessBar` | `showMiniProgress` |
| `showProgressLoadBar` | `showBuffered` |
| `showPlay` | `showPlayButton` |
| `showMediaSession` | `mediaSession` |
| `spaceBar` | `keyboardShortcuts` (full shortcut set — see README) |
| `remember` | `persist` (`boolean \| string` storage key) |
| `extendsContent` | `extraControls` |
| `quietUpdate` | `preserveCurrentOnUpdate` |
| `clearPriorAudioLists` | `replaceListOnUpdate` |
| `autoPlayInitLoadPlayList` | `autoPlayOnListUpdate` |
| `loadAudioErrorPlayNext` | `skipOnError` |
| `playModeShowTime` | `playModeTipDuration` |
| `getContainer` | `container` (`HTMLElement \| (() => HTMLElement) \| null`; `null` renders inline — the SSR path; selector strings are no longer accepted) |
| `sortableOptions` | `sortable` — `boolean \| SortableOptions`; pass `sortable={{ ... }}` to forward options to SortableJS |
| `renderAudioTitle` | `renderTrackTitle(info, isMobile)` |
| `icon` | `icons` — slot names changed (`playLists` → `playlist`, `loop` → `singleLoop`, `toggle` → `minimize`; new slots: `collapse`, `empty`, `controller`); see `PlayerIcons` |
| `locale` | `locale` — now a `LocaleId` (`'en_US' \| 'en_GB' \| 'zh_CN'`) or `Partial<Locale>`; the locale object shape changed (below) |

## Renamed callbacks

All audio callbacks now receive a single `AudioInfo` (`track`, `index`, `tracks`, `currentTime`, `duration`, `volume`, `muted`, `paused`, `ended`, `readyState`, `networkState`, `playMode`, `currentLyric`) — the v4 `(currentPlayId, audioLists, audioInfo)` triples are gone; use `info.index` / `info.tracks`.

| v4 | v5 |
| --- | --- |
| `onAudioPlay(audioInfo)` | `onPlay(info)` |
| `onAudioPause(audioInfo)` | `onPause(info)` |
| `onAudioEnded(id, lists, info)` | `onEnded(info)` |
| `onAudioProgress(audioInfo)` | `onProgress(info)` |
| `onAudioSeeked(audioInfo)` | `onSeeked(info)` |
| `onAudioAbort(id, lists, info)` | `onAbort(info)` |
| `onAudioError(msg, id, lists, info)` | `onError(error, info)` — error object first |
| `onAudioReload(audioInfo)` | `onReload(info)` |
| `onAudioDownload(audioInfo)` | `onDownload(info, download)` — second arg is the resolved `DownloadInfo` |
| `onBeforeAudioDownload(audioInfo)` | `onBeforeDownload(info) => DownloadInfo \| Promise<DownloadInfo> \| void` |
| `onAudioPlayTrackChange(id, lists, info)` | `onTrackChange(info)` |
| `onAudioListsChange(id, lists, info)` | `onTracksChange(tracks, info)` |
| `onAudioPlayModeChange(mode)` | `onPlayModeChange(mode)` |
| `onAudioLyricChange(lineNum, lyric)` | `onLyricChange(line, index)` — note the argument order flipped |
| `onAudioListsPanelChange(visible)` | `onPlaylistToggle(open)` |
| `onAudioVolumeChange(volume)` | `onVolumeChange(volume)` |
| `onAudioListsSortEnd(oldIndex, newIndex)` | Removed — pass `sortable={{ onEnd }}` or observe `onTracksChange` |
| `onCoverClick(mode, lists, info)` | `onCoverClick(info)` |
| `onBeforeDestroy(id, lists, info)` | `onBeforeDestroy(info)` — may return/resolve `false` to cancel |
| `onDestroyed(id, lists, info)` | `onDestroyed(info)` |
| `customDownloader(info)` | `customDownloader(download: DownloadInfo)` — receives `{ src, filename?, mimeType? }` |
| `onThemeChange`, `onModeChange`, `onPlayIndexChange` | Same names; now part of the controlled-prop pattern (`theme`, `mode`, `playIndex` + `default*`) |

## Removed props

| v4 | v5 equivalent |
| --- | --- |
| `once` | Removed — gate `autoPlay`/`onPlay` yourself |
| `playModeTipVisible` | Removed — the mode-change toast always follows `playModeTipDuration` |
| `getAudioInstance` | `ref` → `MusicPlayerHandle.audio` |
| `sortableOptions` | Folded into `sortable` |
| Runtime `prop-types` warnings | Removed entirely — TypeScript only |
| `preload={true}` | `preload` now takes only `'auto' \| 'metadata' \| 'none'` (v4's `true` → `'auto'`); default is `'none'` |

## Styling

### CSS variables: `--rjmp-*` → `--trmp-*`

Theme tokens were renamed and consolidated. The `-light`/`-mobile` suffixed variables no longer exist — those values are remapped on `.trmp-root[data-theme='light']` and `.trmp-root[data-layout='mobile']`, so override the base token inside the matching selector.

| v4 | v5 |
| --- | --- |
| `--rjmp-primary-color` | `--trmp-color-primary` |
| `--rjmp-primary-color-hover` | `--trmp-color-primary-hover` |
| — | `--trmp-color-primary-contrast` (new) |
| `--rjmp-panel-bg` (+`-light`, `-mobile`) | `--trmp-color-panel` / `--trmp-color-panel-mobile` |
| `--rjmp-panel-color` (+`-light`) | `--trmp-color-panel-text` |
| `--rjmp-base-color` | `--trmp-color-panel-muted` |
| `--rjmp-controller-bg` (+`-light`) | `--trmp-color-controller` |
| `--rjmp-bg-color` | `--trmp-color-surface` |
| `--rjmp-lists-item-bg` (+`-light`, `-mobile`) | `--trmp-color-list-item` |
| `--rjmp-lists-item-bg-active` (+`-light`, `-mobile`) | `--trmp-color-list-item-active` |
| `--rjmp-lists-item-bg-playing` (+`-light`, `-mobile`) | `--trmp-color-list-item-playing` |
| `--rjmp-progress-bar-bg` (+`-light`) | `--trmp-color-track` |
| `--rjmp-progress-load-bar-bg` (+`-light`) | `--trmp-color-track-buffered` |
| `--rjmp-lyric-color` | `--trmp-color-lyric` |
| `--rjmp-panel-height` | `--trmp-spacing-panel` |
| `--rjmp-panel-header-height` | `--trmp-spacing-panel-header` |
| `--rjmp-player-size` / `-mobile` | `--trmp-spacing-controller` / `--trmp-spacing-controller-mobile` |
| `--rjmp-lists-panel-width` / `-height` | `--trmp-spacing-playlist-w` / `--trmp-spacing-playlist-h` |
| `--rjmp-progress-bar-height` | `--trmp-spacing-track-h` |
| `--rjmp-panel-border-radius` | `--trmp-radius-panel` |
| `--rjmp-lyric-font-size` / `-mobile` | `--trmp-text-lyric` / `--trmp-text-lyric-mobile` |
| `--rjmp-animate-type` | `--trmp-ease-player` |
| `--rjmp-animate-time` | `--trmp-duration-player` |
| `--rjmp-font-color`, `--rjmp-lists-item-singer-color-light`, `--rjmp-lists-sortable-highlight-bg` | Removed — use `--trmp-color-panel-text` (light remap), `--trmp-color-panel-muted`, and the `.trmp-sortable-highlight` class |

### Class names

The root is now `.trmp-root` (was `.tailwind-react-music-player` / `.tailwind-react-music-player-main`), and the player writes state as data attributes — target those, not theme classes:

| v4 | v5 |
| --- | --- |
| `.light-theme` | `.trmp-root[data-theme='light']` (set via `theme`/`defaultTheme`) |
| `.music-player-panel` | `.trmp-panel` |
| `.player-mobile` / `.tailwind-react-music-player-mobile` | `.trmp-mobile` |
| `.music-player-controller` / `.player-content` | `.trmp-mini` |
| `.audio-lists-panel` | `.trmp-playlist` |
| `.music-player-lyric` | `.trmp-lyric` |
| `.audio-lists-panel-sortable-highlight-bg` | `.trmp-sortable-highlight` |
| `.player-name` / `.player-singer` | `.trmp-track-title` |
| `.music-player-time` | `.trmp-time` |
| `.music-player-mode-icon`, `.player-icons` | `.trmp-icon-button` |
| play-mode tip | `.trmp-toast` |
| cover image | `.trmp-cover` |
| `.rc-slider-*` | native `input.trmp-range` inside `.trmp-range-wrap` (filled portion via `--trmp-range-fill`) |
| `.rc-switch` | `.trmp-theme-switch` (`role="switch"` button) |

## Locale shape

The `Locale` object was rebuilt — every `*Text` suffix was dropped, several keys became functions, and new keys exist (`mute`, `unmute`, `seek`, `loading`, `systemTheme`, `playlistCount`, `nowPlaying`, `removeTrack`, `reorderHint`). Common mappings: `playModeText` → `playMode`, `openText` → `open`, `closeText` → `close`, `emptyText` → `emptyPlaylist`, `clickToPlayText` → `play`, `clickToPauseText` → `pause`, `nextTrackText` → `next`, `previousTrackText` → `previous`, `reloadText` → `reload`, `volumeText` → `volume`, `playListsText` → `playlist`, `toggleLyricText` → `toggleLyric`, `toggleMiniModeText` → `minimize`, `destroyText` → `destroy`, `downloadText` → `download`, `lightThemeText` → `lightTheme`, `darkThemeText` → `darkTheme`, `switchThemeText` → `theme`, `removeAudioListsText` → `clearPlaylist`, `emptyLyricText` → `noLyric`, `clickToDeleteText(name)` → `removeTrack(name)`, `audioTitle` → removed (use `renderTrackTitle`), `controllerTitle` → removed. See the `Locale` type in `src/i18n/types.ts` for the full list; `createLocale` merges partial overrides over a base.

`TailwindReactMusicPlayer.locale.zh_CN` → `import { locales } from 'tailwind-react-music-player'; locales.zh_CN` — or just `locale="zh_CN"`. The new `en_GB` locale is also available.

## Behaviour changes

- **Volume is perceptual.** `volume`/`defaultVolume`/`setVolume` use a `0..1` slider scale mapped to gain quadratically (`gain = v²`). If you scripted `audio.volume` directly, the value no longer matches the slider.
- **`audioLists` updates merge** rather than reset by default; `preserveCurrentOnUpdate` keeps the playing track, `replaceListOnUpdate` restores v4's `clearPriorAudioLists` replace behaviour.
- **Playlist sorting is opt-in.** v4 enabled SortableJS on the list unconditionally; v5 requires `sortable` (or `sortable={{ animation: 150 }}` to forward options).
- **Sorting uses SortableJS `swap`** mode with `.trmp-sortable-highlight` as the highlight class.
- **`onBeforeDestroy` is awaitable** — a rejected promise also cancels destruction.
- **The destroy flow pauses before unmounting**, and `destroy()` is available on the ref handle.
- **`defaultPosition` default changed** to `{ right: 30, bottom: 30 }` (v4 defaulted to `{ top: 0, left: 0 }`).
- **`AudioTrack` loosened and locked down**: only `musicSrc` is required (`name`, `singer`, `cover`, `lyric`, `duration` optional) — but the v4 `[key: string]: any` escape hatch is gone.
- **`audioLists` is required** (v4 defaulted it to `[]`), and **`dragBounds` defaults to unconstrained** (v4's `bounds` defaulted to `'body'`).
- **Lyrics**: `onLyricChange` args flipped to `(line, index)`; `currentLyric` is also on `AudioInfo`.
- **No `prop-types`** — invalid props fail at compile time, not with console warnings.
- **Portal defaults to `document.body`** resolved in an effect, so the component is SSR-safe; `container={null}` renders inline.
- Types renamed: `TailwindReactMusicPlayerProps` → `MusicPlayerProps`, `TailwindReactMusicPlayerAudioListProps` → `AudioTrack`, `TailwindReactMusicPlayerAudioInfo` → `AudioInfo`, `TailwindReactMusicPlayerIcon` → `PlayerIcons`.
