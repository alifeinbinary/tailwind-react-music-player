export { MusicPlayer as default, MusicPlayer } from './components/music-player'
export { useMusicPlayer } from './hooks/use-music-player'
export { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'
export { locales, createLocale, resolveLocale } from './i18n'
export type { Locale, LocaleId } from './i18n/types'
export { defaultIcons } from './components/icons'
export type { PlayerIcons, IconKey } from './components/icons'
export {
  PLAY_MODES,
  THEMES,
  PLAYER_MODES,
  MEDIA_QUERY,
  TIMING,
} from './constants'
export { parseLrc, formatTime } from './core'
export type * from './types'
