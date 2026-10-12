import type { RefObject } from 'react'
import type {
  AudioInfo,
  PlaybackStatus,
  PlayMode,
  PlaylistItem,
  Theme,
  UseMusicPlayerOptions,
} from '../types'

/** Internal reducer state shared by the decomposed player hooks. */
export interface InternalState {
  tracks: readonly PlaylistItem[]
  index: number
  src: string | null
  status: PlaybackStatus
  error: MediaError | Error | null
  currentTime: number
  duration: number
  buffered: number
  muted: boolean
  fading: 'in' | 'out' | null
  lyricIndex: number
  playbackRate: number
  /** Incremented on every explicit track selection. */
  selectGen: number
}

/** Partial-update dispatcher for {@link InternalState}. */
export type PlayerPatch = (patch: Partial<InternalState>) => void

/** Latest render values mirrored into a ref for once-bound listeners. */
export interface PlayerLatest {
  options: UseMusicPlayerOptions
  state: InternalState
  index: number
  track: PlaylistItem | null
  playMode: PlayMode
  volume: number
  theme: Theme
}

/** Shared wiring passed to every decomposed player hook. */
export interface PlayerContext {
  /** Stable accessor to the latest-values mirror for once-bound listeners. */
  getLatest(): PlayerLatest
  audioRef: RefObject<HTMLAudioElement | null>
  /** When true the player must start playback at the next `canplay`. */
  pendingPlayRef: RefObject<boolean>
  /** Synchronous "is playing" mirror for the play+playing event pair. */
  playingRef: RefObject<boolean>
  patch: PlayerPatch
  getAudioInfo(): AudioInfo
}

/** Options accepted by `selectIndex`. */
export interface SelectOptions {
  /** Whether to start playback once the source can play (default true). */
  autoplay?: boolean
  /** Whether to fire `onPlayIndexChange` (default true). */
  notify?: boolean
  /** Bypass controlled `playIndex` (used by reload). */
  force?: boolean
}
