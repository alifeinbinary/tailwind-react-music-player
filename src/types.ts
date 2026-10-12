import * as React from 'react'
import { type DraggableBounds } from 'react-draggable'
import Sortable from 'sortablejs'

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
