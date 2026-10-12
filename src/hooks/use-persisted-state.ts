import { useCallback, useEffect, useMemo, useRef } from 'react'
import { PERSIST_KEY, TIMING } from '../constants'
import { createPersistence, findIndexById, throttle } from '../core'
import type { PersistedPlayerState } from '../core/persistence'
import type { PlayerContext, SelectOptions } from './player-context'
import type { PlayMode, Theme } from '../types'

/** Dependencies {@link usePersistedState} needs for the mount restore. */
export interface PersistedStateDeps {
  /** `false` | `true` (default key) | custom storage key. */
  persist: boolean | string
  /** Whether the corresponding props are uncontrolled/unset. */
  restorePlayMode: boolean
  restoreTheme: boolean
  restoreVolume: boolean
  setPlayMode(mode: PlayMode): void
  setTheme(theme: Theme): void
  setVolume(volume: number): void
  selectIndex(index: number, opts?: SelectOptions): void
  /** Autoplay preference for a restored track selection. */
  autoPlay: boolean
}

/** Persistence API returned by {@link usePersistedState}. */
export interface PersistedStateApi {
  /** Schedules a throttled write once the next state has committed. */
  persistNow(): void
  /** Removes the persisted snapshot (used by clearTracks). */
  clear(): void
  /** Returns and consumes a pending persisted `currentTime` (first canplay). */
  takeRestoreTime(): number | null
}

/**
 * Owns the persistence layer: instance creation, a throttled deferred
 * writer (scheduled one macrotask out so it reads committed state),
 * mount-time restore of persisted settings/track/currentTime, and
 * cleanup on unmount.
 */
export function usePersistedState(
  ctx: PlayerContext,
  deps: PersistedStateDeps,
): PersistedStateApi {
  const { getLatest, audioRef, patch } = ctx
  const {
    persist,
    restorePlayMode,
    restoreTheme,
    restoreVolume,
    setPlayMode,
    setTheme,
    setVolume,
    selectIndex,
    autoPlay,
  } = deps

  const persistence = useMemo(
    () =>
      persist
        ? createPersistence(persist === true ? PERSIST_KEY : persist)
        : null,
    [persist],
  )

  // throttled writer created in an effect (reads refs, so it cannot be
  // built during render)
  const writePersistedRef = useRef<
    (() => void) & { flush(): void; cancel(): void }
  >(null)
  useEffect(() => {
    if (!persistence) {
      writePersistedRef.current = null
      return undefined
    }
    const writer = throttle(() => {
      const l = getLatest()
      const t = l.index >= 0 ? (l.state.tracks[l.index] ?? null) : null
      const audio = audioRef.current
      const stateToWrite: PersistedPlayerState = {
        version: 1,
        trackId: t?.id ?? null,
        musicSrc: l.state.src,
        currentTime: audio?.currentTime ?? l.state.currentTime,
        volume: l.volume,
        muted: audio?.muted ?? l.state.muted,
        playMode: l.playMode,
        theme: l.theme,
        playing: l.state.status === 'playing',
      }
      persistence.write(stateToWrite)
    }, TIMING.PERSIST_THROTTLE_MS)
    writePersistedRef.current = writer
    return () => writer.cancel()
  }, [getLatest, audioRef, persistence])

  // deferred one macrotask so the throttled write reads committed state
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)
  const persistNow = useCallback(() => {
    const writePersisted = writePersistedRef.current
    if (
      unmountedRef.current ||
      !writePersisted ||
      persistTimerRef.current !== null
    ) {
      return
    }
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null
      writePersisted()
    }, 0)
  }, [])

  const clear = useCallback(() => {
    persistence?.clear()
  }, [persistence])

  const restoreTimeRef = useRef<number | null>(null)
  const takeRestoreTime = useCallback(() => {
    const t = restoreTimeRef.current
    restoreTimeRef.current = null
    return t
  }, [])

  // mount restore — runs once; declared early so its cleanup (flush +
  // unmounted flag) precedes the orchestrator's audio.pause() on unmount
  const restoredRef = useRef(false)
  useEffect(() => {
    if (!persistence || restoredRef.current) return
    restoredRef.current = true
    const saved = persistence.read()
    if (!saved) return
    const l = getLatest()
    if (restorePlayMode) setPlayMode(saved.playMode)
    if (restoreTheme) setTheme(saved.theme)
    if (restoreVolume) setVolume(saved.volume)
    if (saved.muted) patch({ muted: true })
    restoreTimeRef.current = saved.currentTime
    const byId = saved.trackId
      ? findIndexById(l.state.tracks, saved.trackId)
      : -1
    const bySrc =
      byId === -1 && saved.musicSrc
        ? l.state.tracks.findIndex((t) => t.musicSrc === saved.musicSrc)
        : byId
    if (bySrc >= 0 && bySrc !== l.index) {
      selectIndex(bySrc, { autoplay: autoPlay })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only restore
  }, [])

  // unmount: clear pending deferral and flush the trailing write
  useEffect(
    () => () => {
      unmountedRef.current = true
      if (persistTimerRef.current !== null) {
        clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }
      writePersistedRef.current?.flush()
    },
    [],
  )

  return { persistNow, clear, takeRestoreTime }
}
