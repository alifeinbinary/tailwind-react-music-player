import { useCallback, useEffect, useRef } from 'react'
import { TIMING } from '../constants'
import { adjacentIndex, clampIndex, findIndexById } from '../core'
import type { PlayerContext, SelectOptions } from './player-context'

/** Track-selection and source-resolution API. */
export interface AudioSourceApi {
  selectIndex(index: number, opts?: SelectOptions): void
  playIndex(index: number): void
  playId(id: string): void
  next(): void
  prev(): void
  reload(): void
  /** Advances to the next playable index per play mode, if any. */
  skipToNextOnError(): void
}

/**
 * Owns track selection and `musicSrc` resolution: generation guard for
 * stale async resolutions, a per-id resolution cache, `onTrackChange` /
 * `onPlayIndexChange` emission, and the `audio.load()`-on-src-change
 * effect.
 */
export function useAudioSource(
  ctx: PlayerContext,
  deps: {
    cancelFade(restoreGain: boolean): void
    seek(seconds: number): void
    /** `index:trackId:selectGen` — re-runs resolution on selection change. */
    selectKey: string
    /** Resolved source for the load() effect. */
    src: string | null
  },
): AudioSourceApi {
  const {
    getLatest,
    audioRef,
    pendingPlayRef,
    playingRef,
    patch,
    getAudioInfo,
  } = ctx
  const { cancelFade, seek, selectKey, src } = deps
  const generationRef = useRef(0)
  const srcCacheRef = useRef(new Map<string, string>())

  const selectIndex = useCallback(
    (nextIndex: number, opts: SelectOptions = {}) => {
      const l = getLatest()
      const clamped =
        nextIndex < 0 ? -1 : clampIndex(nextIndex, l.state.tracks.length)
      if (opts.notify !== false) {
        l.options.onPlayIndexChange?.(clamped)
      }
      if (l.options.playIndex !== undefined && !opts.force) {
        // controlled: the prop owns the selection
        return
      }
      cancelFade(true)
      pendingPlayRef.current = opts.autoplay ?? true
      playingRef.current = false
      generationRef.current += 1
      patch({
        index: clamped,
        src: null,
        status: clamped >= 0 ? 'loading' : 'idle',
        error: null,
        currentTime: 0,
        duration: 0,
        buffered: 0,
        lyricIndex: -1,
        selectGen: l.state.selectGen + 1,
      })
    },
    [getLatest, pendingPlayRef, playingRef, patch, cancelFade],
  )

  const skipToNextOnError = useCallback(() => {
    const l = getLatest()
    const len = l.state.tracks.length
    if (len === 0 || l.index < 0) return
    if (l.playMode === 'order' && l.index >= len - 1) return
    const next = adjacentIndex(
      'next',
      l.playMode,
      l.index,
      len,
      l.options.random ?? Math.random,
    )
    if (next !== null && next !== l.index) {
      selectIndex(next)
    }
  }, [getLatest, selectIndex])

  // resolves musicSrc for the current index/track; driven by an effect
  const resolveSrc = useCallback(() => {
    const l = getLatest()
    const t = l.track
    const gen = generationRef.current
    if (!t) {
      if (l.state.src !== null) patch({ src: null })
      return
    }
    const finish = (src: string) => {
      if (generationRef.current !== gen) return
      patch({ src })
      l.options.onTrackChange?.(getAudioInfo())
    }
    const fail = (error: unknown) => {
      if (generationRef.current !== gen) return
      const err = error instanceof Error ? error : new Error(String(error))
      patch({ status: 'error', error: err })
      l.options.onError?.(err, getAudioInfo())
      if (l.options.skipOnError ?? true) skipToNextOnError()
    }
    const srcValue = t.musicSrc
    if (typeof srcValue === 'string') {
      finish(srcValue)
      return
    }
    const cached = srcCacheRef.current.get(t.id)
    if (cached !== undefined) {
      finish(cached)
      return
    }
    srcValue().then((src) => {
      srcCacheRef.current.set(t.id, src)
      finish(src)
    }, fail)
  }, [getLatest, patch, getAudioInfo, skipToNextOnError])

  // drive resolution on selection changes
  useEffect(() => {
    resolveSrc()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by selection identity, not every render
  }, [selectKey])

  // load() when src changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (src === null) {
      audio.removeAttribute('src')
      return
    }
    audio.src = src
    audio.load()
  }, [audioRef, src])

  const next = useCallback(() => {
    const l = getLatest()
    const nextIndex = adjacentIndex(
      'next',
      l.playMode,
      l.index,
      l.state.tracks.length,
      l.options.random ?? Math.random,
    )
    if (nextIndex !== null) selectIndex(nextIndex)
  }, [getLatest, selectIndex])

  const prev = useCallback(() => {
    const l = getLatest()
    const audio = audioRef.current
    if (
      (l.options.restartCurrentOnPrev ?? false) &&
      (audio?.currentTime ?? 0) > TIMING.RESTART_ON_PREV_THRESHOLD_S
    ) {
      seek(0)
      return
    }
    const prevIndex = adjacentIndex(
      'prev',
      l.playMode,
      l.index,
      l.state.tracks.length,
      l.options.random ?? Math.random,
    )
    if (prevIndex !== null) selectIndex(prevIndex)
  }, [getLatest, audioRef, selectIndex, seek])

  const reload = useCallback(() => {
    const l = getLatest()
    const t = l.track
    if (t) srcCacheRef.current.delete(t.id)
    l.options.onReload?.(getAudioInfo())
    selectIndex(l.index, { notify: false, force: true })
  }, [getLatest, selectIndex, getAudioInfo])

  const playIndex = useCallback(
    (i: number) => {
      selectIndex(i)
    },
    [selectIndex],
  )

  const playId = useCallback(
    (id: string) => {
      const i = findIndexById(getLatest().state.tracks, id)
      if (i >= 0) selectIndex(i)
    },
    [getLatest, selectIndex],
  )

  return {
    selectIndex,
    playIndex,
    playId,
    next,
    prev,
    reload,
    skipToNextOnError,
  }
}
