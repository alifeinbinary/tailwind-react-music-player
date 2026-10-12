import { useCallback } from 'react'
import { PLAY_MODES } from '../constants'
import type { PlayMode, PlayerMode, ResolvedTheme, Theme } from '../types'
import type { PersistedStateApi } from './use-persisted-state'
import type { PlayerContext } from './player-context'
import type { VolumeFadeApi } from './use-volume-fade'

/** Small user-facing actions that do not fit any other extracted hook. */
export interface PlayerActionsApi {
  setVolume(volume: number): void
  volumeBy(delta: number): void
  toggleMute(): void
  setPlayMode(mode: PlayMode): void
  cyclePlayMode(): void
  setTheme(theme: Theme): void
  toggleTheme(): void
  setMode(mode: PlayerMode): void
  toggleMode(): void
}

/**
 * Owns the volume/mute/play-mode/theme/mode actions: setter calls into
 * the controllable-state setters plus the element/persistence side
 * effects.
 */
export function usePlayerActions(
  ctx: PlayerContext,
  deps: {
    fades: VolumeFadeApi
    persistNow: PersistedStateApi['persistNow']
    resolvedTheme: ResolvedTheme
    mode: PlayerMode
    setVolumeState(v: number): void
    setPlayModeState(m: PlayMode): void
    setThemeState(t: Theme): void
    setModeState(m: PlayerMode): void
  },
): PlayerActionsApi {
  const { getLatest, audioRef, patch } = ctx
  const {
    fades,
    persistNow,
    resolvedTheme,
    mode,
    setVolumeState,
    setPlayModeState,
    setThemeState,
    setModeState,
  } = deps

  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.min(Math.max(v, 0), 1)
      setVolumeState(clamped)
      fades.applyVolumeGain(clamped)
      const audio = audioRef.current
      if (clamped > 0 && audio?.muted) {
        audio.muted = false
      }
      persistNow()
    },
    [setVolumeState, fades, audioRef, persistNow],
  )

  const volumeBy = useCallback(
    (delta: number) => {
      setVolume(getLatest().volume + delta)
    },
    [getLatest, setVolume],
  )

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    const next = !(audio?.muted ?? getLatest().state.muted)
    if (audio) audio.muted = next
    patch({ muted: next })
    persistNow()
  }, [getLatest, audioRef, patch, persistNow])

  const setPlayMode = useCallback(
    (m: PlayMode) => {
      setPlayModeState(m)
      persistNow()
    },
    [setPlayModeState, persistNow],
  )

  const cyclePlayMode = useCallback(() => {
    const l = getLatest()
    const i = PLAY_MODES.indexOf(l.playMode)
    setPlayMode(PLAY_MODES[(i + 1) % PLAY_MODES.length])
  }, [getLatest, setPlayMode])

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t)
      persistNow()
    },
    [setThemeState, persistNow],
  )

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [setTheme, resolvedTheme])

  const setMode = useCallback(
    (m: PlayerMode) => {
      setModeState(m)
    },
    [setModeState],
  )

  const toggleMode = useCallback(() => {
    setMode(mode === 'mini' ? 'full' : 'mini')
  }, [setMode, mode])

  return {
    setVolume,
    volumeBy,
    toggleMute,
    setPlayMode,
    cyclePlayMode,
    setTheme,
    toggleTheme,
    setMode,
    toggleMode,
  }
}
