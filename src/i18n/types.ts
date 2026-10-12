import type { PlayMode } from '../types'

/** Every user-visible string in the player UI. */
export interface Locale {
  playMode: Record<PlayMode, string>
  open: string
  close: string
  minimize: string
  destroy: string
  play: string
  pause: string
  previous: string
  next: string
  reload: string
  download: string
  volume: string
  mute: string
  unmute: string
  seek: string
  playlist: string
  playlistCount: (count: number) => string
  emptyPlaylist: string
  removeTrack: (name: string) => string
  clearPlaylist: string
  toggleLyric: string
  noLyric: string
  theme: string
  lightTheme: string
  darkTheme: string
  systemTheme: string
  loading: string
  nowPlaying: (name: string) => string
  /** Announcement for keyboard reordering (e.g. "Press Alt+Arrow keys to reorder"). */
  reorderHint: string
}

/** Built-in locale identifiers. */
export type LocaleId = 'en_US' | 'en_GB' | 'zh_CN'
