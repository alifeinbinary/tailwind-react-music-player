import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Locale } from '../i18n'
import type {
  MusicPlayerActions,
  MusicPlayerState,
  MusicPlayerUIProps,
} from '../types'
import type { PlayerIcons } from './icons'

/** Fully-resolved context shared by every composite component. */
export interface PlayerContextValue {
  state: MusicPlayerState
  actions: MusicPlayerActions
  locale: Locale
  icons: PlayerIcons
  /**
   * UI props with all component-level defaults applied — booleans that
   * default to true are non-optional here.
   */
  ui: MusicPlayerUIProps & {
    draggable: boolean
    allowModeToggle: boolean
    responsive: boolean
    seekable: boolean
    glassBackground: boolean
    hideEmptyCover: boolean
    showMiniCover: boolean
    showMiniProgress: boolean
    showBuffered: boolean
    showPlayButton: boolean
    showReload: boolean
    showDownload: boolean
    showPlayMode: boolean
    showThemeSwitch: boolean
    showLyric: boolean
    showDestroy: boolean
    removable: boolean
    keyboardShortcuts: boolean
    playModeTipDuration: number
  }
}

const Ctx = createContext<PlayerContextValue | null>(null)

/** Provides the resolved player context to composite children. */
export function PlayerProvider({
  value,
  children,
}: {
  value: PlayerContextValue
  children: ReactNode
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Reads the player context; throws outside {@link PlayerProvider}. */
export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error('usePlayerContext must be used inside <MusicPlayer>')
  }
  return ctx
}
