import * as React from 'react'
import { type RefObject } from 'react'
import { type DraggableBounds } from 'react-draggable'
import type { Locale, LocaleId } from './i18n'
import type { PlayerIcons } from './components/icons'
import { PLAYER_MODES, PLAY_MODES, THEMES } from './constants'
import { type LyricLine } from './core/lyric-parser'
// ---- v5 core types ----

/** Play mode controlling what happens on track end and prev/next. */
export type PlayMode = (typeof PLAY_MODES)[number]

/** Player color theme. */
export type Theme = (typeof THEMES)[number]

/** Player layout mode. */
export type PlayerMode = (typeof PLAYER_MODES)[number]

/** A track source: a URL or an async resolver returning a URL. */
export type MusicSrc = string | (() => Promise<string>)

/** A playlist entry as supplied by the consumer. */
export interface AudioTrack {
  name?: React.ReactNode
  singer?: React.ReactNode
  cover?: string
  musicSrc: MusicSrc
  lyric?: string
  duration?: number
}

/** A playlist entry with a stable player-assigned id. */
export interface PlaylistItem extends AudioTrack {
  readonly id: string
}

/** Playback lifecycle status of the player. */
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

/** The concrete theme after resolving `auto`. */
export type ResolvedTheme = 'dark' | 'light'

/** Unified payload passed to every player callback. */
export interface AudioInfo {
  track: PlaylistItem | null
  index: number
  tracks: readonly PlaylistItem[]
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  paused: boolean
  ended: boolean
  readyState: number
  networkState: number
  playMode: PlayMode
  currentLyric: string | null
}

/** A download request as handed to {@link MusicPlayerCallbacks.customDownloader}. */
export interface DownloadInfo {
  src: string
  filename?: string
  mimeType?: string
}

/** Subset of SortableJS options exposed in the public API.
 * Self-contained so consumers don't need `@types/sortablejs`; an index
 * signature keeps every SortableJS option assignable. */
export interface SortableOptions {
  animation?: number
  handle?: string
  ghostClass?: string
  chosenClass?: string
  dragClass?: string
  onEnd?: (event: { oldIndex?: number; newIndex?: number }) => void
  [key: string]: unknown
}

/** Fade durations in milliseconds. */
export interface VolumeFadeOptions {
  fadeIn?: number
  fadeOut?: number
}

/** Lifecycle and data callbacks of {@link UseMusicPlayerOptions}. */
export interface MusicPlayerCallbacks {
  onPlay?(info: AudioInfo): void
  onPause?(info: AudioInfo): void
  onEnded?(info: AudioInfo): void
  onError?(error: MediaError | Error | null, info: AudioInfo): void
  onProgress?(info: AudioInfo): void
  onSeeked?(info: AudioInfo): void
  onAbort?(info: AudioInfo): void
  onTrackChange?(info: AudioInfo): void
  onTracksChange?(tracks: readonly PlaylistItem[], info: AudioInfo): void
  onLyricChange?(line: string, index: number): void
  onReload?(info: AudioInfo): void
  onBeforeDownload?(
    info: AudioInfo,
  ): DownloadInfo | Promise<DownloadInfo> | void
  onDownload?(info: AudioInfo, download: DownloadInfo): void
  customDownloader?(download: DownloadInfo): void
}

/** Options accepted by {@link useMusicPlayer}. */
export interface UseMusicPlayerOptions extends MusicPlayerCallbacks {
  audioLists: readonly AudioTrack[]
  playIndex?: number
  defaultPlayIndex?: number
  onPlayIndexChange?(index: number): void
  playMode?: PlayMode
  defaultPlayMode?: PlayMode
  onPlayModeChange?(mode: PlayMode): void
  theme?: Theme
  defaultTheme?: Theme
  onThemeChange?(theme: Theme): void
  mode?: PlayerMode
  defaultMode?: PlayerMode
  onModeChange?(mode: PlayerMode): void
  /** Slider-scale volume 0..1 (mapped to gain internally). */
  volume?: number
  defaultVolume?: number
  onVolumeChange?(volume: number): void
  /** Auto-play the first track (subject to browser gesture policy). Default `true`. */
  autoPlay?: boolean
  /** `preload` attribute forwarded to the audio element. Default `'none'`. */
  preload?: 'auto' | 'metadata' | 'none'
  /** `crossOrigin` attribute forwarded to the audio element. Default: omitted. */
  crossOrigin?: 'anonymous' | 'use-credentials'
  /** Skip to the next track on load/playback errors. Default `true`. */
  skipOnError?: boolean
  /** Prev button restarts the track when past the restart threshold. Default `false`. */
  restartCurrentOnPrev?: boolean
  /** Keep the currently playing track across `audioLists` updates. Default `false`. */
  preserveCurrentOnUpdate?: boolean
  /** Replace the list on `audioLists` update instead of merging. Default `false`. */
  replaceListOnUpdate?: boolean
  /** Auto-play when `audioLists` changes. Default `false`. */
  autoPlayOnListUpdate?: boolean
  /** Persist state: `false` | `true` (default key) | custom storage key. */
  persist?: boolean | string
  /** Volume fade durations in ms (skipped on iOS). */
  volumeFade?: VolumeFadeOptions
  /** Media query used for the mobile UI; `null` disables. */
  mobileMediaQuery?: string | null
  /** Publish Media Session metadata/action handlers. Default `false`. */
  mediaSession?: boolean
  /** Injectable random source for shuffle (tests). */
  random?: () => number
}

/** Reactive state returned by {@link useMusicPlayer}. */
export interface MusicPlayerState {
  tracks: readonly PlaylistItem[]
  index: number
  track: PlaylistItem | null
  src: string | null
  status: PlaybackStatus
  error: MediaError | Error | null
  currentTime: number
  duration: number
  /** Buffered fraction `0..1`. */
  buffered: number
  /** Slider-scale volume 0..1. */
  volume: number
  muted: boolean
  /** Active volume fade direction. */
  fading: 'in' | 'out' | null
  playMode: PlayMode
  theme: Theme
  resolvedTheme: ResolvedTheme
  mode: PlayerMode
  isMobile: boolean
  lyricLines: readonly LyricLine[]
  lyricIndex: number
  currentLyric: string | null
}

/** Imperative actions returned by {@link useMusicPlayer}. */
export interface MusicPlayerActions {
  play(): Promise<void>
  pause(): void
  togglePlay(): void
  playIndex(index: number): void
  playId(id: string): void
  next(): void
  prev(): void
  reload(): void
  seek(seconds: number): void
  seekBy(seconds: number): void
  setVolume(volume: number): void
  volumeBy(delta: number): void
  toggleMute(): void
  setPlayMode(mode: PlayMode): void
  cyclePlayMode(): void
  setTheme(theme: Theme): void
  toggleTheme(): void
  setMode(mode: PlayerMode): void
  toggleMode(): void
  removeTrack(id: string): void
  clearTracks(): void
  reorderTracks(from: number, to: number): void
  download(): Promise<void>
  getAudioInfo(): AudioInfo
}

/** Props spread onto the `<audio>` element rendered by the consumer. */
export interface MusicPlayerAudioProps {
  ref: (el: HTMLAudioElement | null) => void
  src?: string
  preload: 'auto' | 'metadata' | 'none'
  crossOrigin?: 'anonymous' | 'use-credentials'
}

/** Return value of {@link useMusicPlayer}. */
export interface UseMusicPlayerResult {
  state: MusicPlayerState
  actions: MusicPlayerActions
  audioRef: RefObject<HTMLAudioElement | null>
  audioProps: MusicPlayerAudioProps
}

/** Non-audio props of the rendered `MusicPlayer` component. */
export interface MusicPlayerUIProps {
  className?: string
  style?: React.CSSProperties
  /**
   * Portal container for the player UI. `null` renders inline (no
   * portal); the default resolves to `document.body` in an effect.
   */
  container?: HTMLElement | (() => HTMLElement) | null
  /** Locale id or partial string overrides. */
  locale?: LocaleId | Partial<Locale>
  /** Per-slot icon overrides. */
  icons?: Partial<PlayerIcons>
  draggable?: boolean
  dragBounds?: string | DraggableBounds
  defaultPosition?: {
    top?: number | string
    left?: number | string
    right?: number | string
    bottom?: number | string
  }
  allowModeToggle?: boolean
  responsive?: boolean
  seekable?: boolean
  glassBackground?: boolean
  hideEmptyCover?: boolean
  showMiniCover?: boolean
  showMiniProgress?: boolean
  showBuffered?: boolean
  showPlayButton?: boolean
  showReload?: boolean
  showDownload?: boolean
  showPlayMode?: boolean
  showThemeSwitch?: boolean
  showLyric?: boolean
  showDestroy?: boolean
  removable?: boolean
  sortable?: boolean | SortableOptions
  keyboardShortcuts?: boolean
  /** How long a mode-change toast stays visible (ms). */
  playModeTipDuration?: number
  extraControls?: React.ReactNode
  lyricClassName?: string
  renderTrackTitle?(info: AudioInfo, isMobile: boolean): React.ReactNode
  onCoverClick?(info: AudioInfo): void
  onPlaylistToggle?(open: boolean): void
  /** Return/resolve `false` to cancel destruction. */
  onBeforeDestroy?(info: AudioInfo): boolean | void | Promise<boolean | void>
  onDestroyed?(info: AudioInfo): void
}

/** Full prop surface of the `MusicPlayer` component. */
export type MusicPlayerProps = UseMusicPlayerOptions & MusicPlayerUIProps

/** Imperative handle exposed via `ref` on `MusicPlayer`. */
export interface MusicPlayerHandle extends MusicPlayerActions {
  /** The live audio element (null before mount). */
  readonly audio: HTMLAudioElement | null
  /** Tears down the player UI (subject to `onBeforeDestroy`). */
  destroy(): void
}
