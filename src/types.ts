import * as React from 'react'
import { type RefObject } from 'react'
import { type DraggableBounds } from 'react-draggable'
import Sortable from 'sortablejs'

import { PLAYER_MODES, PLAY_MODES, THEMES } from './constants'
import { type LyricLine } from './core/lyric-parser'

export interface TailwindReactMusicPlayerAudioInfo {
  cover: string
  currentTime: number
  duration: number
  ended: boolean
  musicSrc: string
  muted: boolean
  name: string
  networkState: number
  paused: boolean
  played: any
  readyState: number
  startDate: any
  volume: number
  lyric: string
  currentLyric: string
  playIndex: number
  __PLAYER_KEY__?: string
  [key: string]: any
}

export type TailwindReactMusicPlayerTheme = 'dark' | 'light' | 'auto'
export type TailwindReactMusicPlayerMode = 'mini' | 'full'
export type TailwindReactMusicPlayerPlayMode =
  'order' | 'orderLoop' | 'singleLoop' | 'shufflePlay'

export interface TailwindReactMusicPlayerAudioListProps {
  name?: React.ReactNode
  musicSrc?: (() => Promise<string>) | string
  singer?: React.ReactNode
  cover?: string
  lyric?: string
  duration?: number
  [key: string]: any
}

export type TailwindReactMusicPlayerAudioList =
  TailwindReactMusicPlayerAudioListProps & {
    __PLAYER_KEY__?: string
  }

export interface TailwindReactMusicPlayerInstance extends HTMLAudioElement {
  destroy?: () => void
  updatePlayIndex?: (index: number) => void
  playByIndex?: (index: number) => void
  playNext?: () => void
  playPrev?: () => void
  togglePlay?: () => void
  clear?: () => void
  sortable?: Sortable
}

export interface TailwindReactMusicPlayerIcon {
  pause?: React.ReactNode
  play?: React.ReactNode
  destroy?: React.ReactNode
  close?: React.ReactNode
  delete?: React.ReactNode
  download?: React.ReactNode
  toggle?: React.ReactNode
  lyric?: React.ReactNode
  volume?: React.ReactNode
  mute?: React.ReactNode
  next?: React.ReactNode
  prev?: React.ReactNode
  playLists?: React.ReactNode
  reload?: React.ReactNode
  loop?: React.ReactNode
  order?: React.ReactNode
  orderLoop?: React.ReactNode
  shuffle?: React.ReactNode
  loading?: React.ReactNode
  packUpPanelMobile?: React.ReactNode
  empty?: React.ReactNode
  [key: string]: React.ReactNode
}

export interface TailwindReactMusicPlayerPlayModeText {
  order: React.ReactNode
  orderLoop: React.ReactNode
  singleLoop: React.ReactNode
  shufflePlay: React.ReactNode
}

export interface TailwindReactMusicPlayerCustomLocale {
  playModeText: TailwindReactMusicPlayerPlayModeText
  openText: React.ReactNode
  closeText: React.ReactNode
  emptyText: React.ReactNode
  clickToPlayText: React.ReactNode
  clickToPauseText: React.ReactNode
  nextTrackText: React.ReactNode
  previousTrackText: React.ReactNode
  reloadText: React.ReactNode
  volumeText: React.ReactNode
  playListsText: React.ReactNode
  toggleLyricText: React.ReactNode
  toggleMiniModeText: React.ReactNode
  destroyText: React.ReactNode
  downloadText: React.ReactNode
  lightThemeText: React.ReactNode
  darkThemeText: React.ReactNode
  switchThemeText: React.ReactNode
  removeAudioListsText: React.ReactNode
  clickToDeleteText: (name: React.ReactNode) => React.ReactNode
  controllerTitle: React.ReactNode
  emptyLyricText: React.ReactNode
  loadingText?: React.ReactNode
  notContentText?: React.ReactNode
  audioTitle?:
    | ((audioInfo: TailwindReactMusicPlayerAudioInfo) => React.ReactNode)
    | React.ReactNode
  [key: string]: any
}

export type TailwindReactMusicPlayerLocale =
  'zh_CN' | 'en_US' | TailwindReactMusicPlayerCustomLocale

export interface TransformedDownloadAudioInfo {
  src: string
  filename?: string
  mimeType?: string
}

export interface TailwindReactMusicPlayerProps {
  style?: React.CSSProperties
  className?: string
  audioLists: Array<TailwindReactMusicPlayerAudioListProps>
  locale?: TailwindReactMusicPlayerLocale
  icon?: TailwindReactMusicPlayerIcon
  theme?: TailwindReactMusicPlayerTheme
  mode?: TailwindReactMusicPlayerMode
  defaultPlayMode?: TailwindReactMusicPlayerPlayMode
  playMode?: TailwindReactMusicPlayerPlayMode
  drag?: boolean
  seeked?: boolean
  autoPlay?: boolean
  defaultPosition?: {
    top?: number | string
    left?: number | string
    right?: number | string
    bottom?: number | string
  }
  responsive?: boolean
  quietUpdate?: boolean
  onAudioPlay?: (audioInfo: TailwindReactMusicPlayerAudioInfo) => void
  onAudioPause?: (audioInfo: TailwindReactMusicPlayerAudioInfo) => void
  onAudioEnded?: (
    currentPlayId: string,
    audioLists: Array<TailwindReactMusicPlayerAudioListProps>,
    audioInfo: TailwindReactMusicPlayerAudioInfo,
  ) => void
  onAudioAbort?: (
    currentPlayId: string,
    audioLists: Array<TailwindReactMusicPlayerAudioListProps>,
    audioInfo: TailwindReactMusicPlayerAudioInfo,
  ) => void
  onAudioVolumeChange?: (volume: number) => void
  onAudioError?: (
    error: any,
    currentPlayId: string,
    audioLists: Array<TailwindReactMusicPlayerAudioListProps>,
    audioInfo: TailwindReactMusicPlayerAudioInfo,
  ) => void
  onAudioProgress?: (audioInfo: TailwindReactMusicPlayerAudioInfo) => void
  onAudioSeeked?: (audioInfo: TailwindReactMusicPlayerAudioInfo) => void
  onAudioDownload?: (
    audioInfo: TailwindReactMusicPlayerAudioInfo,
    transformedDownloadAudioInfo: TransformedDownloadAudioInfo,
  ) => void
  onAudioReload?: (audioInfo: TailwindReactMusicPlayerAudioInfo) => void
  onThemeChange?: (theme: TailwindReactMusicPlayerTheme) => void
  onAudioListsChange?: (
    currentPlayId: string,
    audioLists: Array<TailwindReactMusicPlayerAudioListProps>,
    audioInfo: TailwindReactMusicPlayerAudioInfo,
  ) => void
  onPlayModeChange?: (playMode: TailwindReactMusicPlayerPlayMode) => void
  onModeChange?: (mode: TailwindReactMusicPlayerMode) => void
  onAudioListsPanelChange?: (panelVisible: boolean) => void
  onAudioPlayTrackChange?: (
    currentPlayId: string,
    audioLists: Array<TailwindReactMusicPlayerAudioListProps>,
    audioInfo: TailwindReactMusicPlayerAudioInfo,
  ) => void
  onAudioListsSortEnd?: (oldIndex: number, newIndex: number) => void
  /** @deprecated use onAudioListsSortEnd instead */
  onAudioListsDragEnd?: (oldIndex: number, newIndex: number) => void
  onAudioLyricChange?: (lineNum: number, txt: string) => void
  showDownload?: boolean
  showPlay?: boolean
  showReload?: boolean
  showPlayMode?: boolean
  showThemeSwitch?: boolean
  showMiniModeCover?: boolean
  showDestroy?: boolean
  showMediaSession?: boolean
  showProgressLoadBar?: boolean
  playModeTipVisible?: boolean
  toggleMode?: boolean
  once?: boolean
  extendsContent?: React.ReactNode
  defaultVolume?: number
  playModeShowTime?: number
  bounds?: string | DraggableBounds
  showMiniProcessBar?: boolean
  loadAudioErrorPlayNext?: boolean
  preload?: boolean | 'auto' | 'metadata' | 'none'
  glassBg?: boolean
  remember?: boolean
  remove?: boolean
  defaultPlayIndex?: number
  playIndex?: number
  lyricClassName?: string
  showLyric?: boolean
  getContainer?: () => HTMLElement
  getAudioInstance?: (instance: TailwindReactMusicPlayerInstance) => void
  autoHiddenCover?: boolean
  onBeforeAudioDownload?: (
    audioInfo: TailwindReactMusicPlayerAudioInfo,
  ) => Promise<TransformedDownloadAudioInfo> | void
  clearPriorAudioLists?: boolean
  autoPlayInitLoadPlayList?: boolean
  spaceBar?: boolean
  onBeforeDestroy?: (
    currentPlayId: string,
    audioLists: Array<TailwindReactMusicPlayerAudioListProps>,
    audioInfo: TailwindReactMusicPlayerAudioInfo,
  ) => Promise<void>
  onDestroyed?: (
    currentPlayId: string,
    audioLists: Array<TailwindReactMusicPlayerAudioListProps>,
    audioInfo: TailwindReactMusicPlayerAudioInfo,
  ) => void
  customDownloader?: (downloadAudioInfo: TransformedDownloadAudioInfo) => void
  onCoverClick?: (
    mode: TailwindReactMusicPlayerMode,
    audioLists: Array<TailwindReactMusicPlayerAudioListProps>,
    audioInfo: TailwindReactMusicPlayerAudioInfo,
  ) => void
  onPlayIndexChange?: (playIndex: number) => void
  renderAudioTitle?: (
    audioInfo: TailwindReactMusicPlayerAudioInfo,
    isMobile: boolean,
  ) => React.ReactNode
  mobileMediaQuery?: string
  volumeFade?: {
    fadeIn?: number
    fadeOut?: number
  }
  restartCurrentOnPrev?: boolean
  sortableOptions?: Sortable.SortableOptions
}

export interface TailwindReactMusicPlayerState {
  audioLists: TailwindReactMusicPlayerAudioList[]
  playId: string
  name: React.ReactNode
  cover?: string
  singer?: React.ReactNode
  musicSrc: string
  lyric?: string
  currentLyric: React.ReactNode
  isMobile: boolean
  toggle: boolean
  playing: boolean
  currentTime: number
  soundValue: number
  moveX: number
  moveY: number
  loading: boolean
  audioListsPanelVisible: boolean
  playModelNameVisible: boolean
  playModeTipVisible?: boolean
  theme: TailwindReactMusicPlayerTheme
  playMode: TailwindReactMusicPlayerPlayMode | ''
  currentAudioVolume: number
  initAnimate: boolean
  isInitAutoPlay?: boolean
  isInitRemember: boolean
  loadedProgress: number
  removeId: string | number
  isNeedMobileHack: boolean
  audioLyricVisible: boolean
  isAutoPlayWhenUserClicked: boolean
  playIndex: number
  canPlay: boolean
  currentVolumeFade: string
  currentVolumeFadeInterval?: ReturnType<typeof setInterval>
  updateIntervalEndVolume?: (newVolume: number) => void
  isAudioSeeking: boolean
  isResetCoverRotate: boolean
  isPlayDestroyed?: boolean
  [key: string]: any
}

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
  crossOrigin?: 'anonymous'
}

/** Return value of {@link useMusicPlayer}. */
export interface UseMusicPlayerResult {
  state: MusicPlayerState
  actions: MusicPlayerActions
  audioRef: RefObject<HTMLAudioElement | null>
  audioProps: MusicPlayerAudioProps
}
