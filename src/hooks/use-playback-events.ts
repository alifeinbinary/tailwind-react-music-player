import { useCallback } from 'react'
import { nextIndexOnEnded } from '../core'
import type { AudioEventHandlers } from './use-audio-events'
import type { AudioSourceApi } from './use-audio-source'
import type { LyricSyncApi } from './use-lyric-sync'
import type { PersistedStateApi } from './use-persisted-state'
import type { PlayerContext } from './player-context'
import type { VolumeFadeApi } from './use-volume-fade'

const isFinitePositive = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0

/**
 * Maps media events to player behaviour: status/position state updates,
 * pending-play on `canplay`, persisted-currentTime restore, mode-driven
 * `ended` navigation, error skipping, lyric driving, and public
 * callbacks — all read through `getLatest()` so handlers never go stale.
 */
export function usePlaybackEvents(
  ctx: PlayerContext,
  deps: {
    fades: VolumeFadeApi
    source: AudioSourceApi
    lyric: LyricSyncApi
    persisted: PersistedStateApi
  },
): AudioEventHandlers {
  const {
    getLatest,
    audioRef,
    pendingPlayRef,
    playingRef,
    patch,
    getAudioInfo,
  } = ctx
  const { fades, source, lyric, persisted } = deps
  const { persistNow } = persisted

  const onLoadedMetadata = useCallback(() => {
    const l = getLatest()
    const audio = audioRef.current
    if (!audio) return
    const trackDuration = l.track?.duration
    patch({
      duration:
        isFinitePositive(trackDuration) && trackDuration > 0
          ? trackDuration
          : audio.duration,
    })
  }, [getLatest, audioRef, patch])

  const onCanPlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const restoreTime = persisted.takeRestoreTime()
    if (restoreTime !== null) {
      audio.currentTime = restoreTime
    }
    if (pendingPlayRef.current) {
      pendingPlayRef.current = false
      void fades.playImpl()
    } else {
      patch({ status: 'paused' })
    }
  }, [audioRef, pendingPlayRef, patch, fades, persisted])

  const onPlay = useCallback(() => {
    const l = getLatest()
    const wasPlaying = playingRef.current
    playingRef.current = true
    patch({ status: 'playing' })
    lyric.play((audioRef.current?.currentTime ?? 0) * 1000)
    if (!wasPlaying) {
      l.options.onPlay?.(getAudioInfo())
      persistNow()
    }
  }, [getLatest, audioRef, playingRef, patch, lyric, getAudioInfo, persistNow])

  const onPause = useCallback(() => {
    const l = getLatest()
    const audio = audioRef.current
    playingRef.current = false
    if (!audio?.ended) {
      patch({ status: 'paused' })
    }
    l.options.onPause?.(getAudioInfo())
    lyric.pause()
    persistNow()
  }, [getLatest, audioRef, playingRef, patch, lyric, getAudioInfo, persistNow])

  const onEnded = useCallback(() => {
    const l = getLatest()
    lyric.stop()
    playingRef.current = false
    l.options.onEnded?.(getAudioInfo())
    const next = nextIndexOnEnded(
      l.playMode,
      l.index,
      l.state.tracks.length,
      l.options.random ?? Math.random,
    )
    if (next === null) {
      patch({ status: 'paused' })
    } else if (next === l.index) {
      const audio = audioRef.current
      if (audio) audio.currentTime = 0
      pendingPlayRef.current = true
      void audio?.play().catch(() => {})
    } else {
      source.selectIndex(next)
    }
    persistNow()
  }, [
    getLatest,
    audioRef,
    playingRef,
    pendingPlayRef,
    patch,
    lyric,
    getAudioInfo,
    persistNow,
    source,
  ])

  const onError = useCallback(() => {
    const l = getLatest()
    const audioError = audioRef.current?.error ?? null
    patch({ status: 'error', error: audioError })
    l.options.onError?.(audioError, getAudioInfo())
    if (l.options.skipOnError ?? true) source.skipToNextOnError()
    persistNow()
  }, [getLatest, audioRef, patch, getAudioInfo, persistNow, source])

  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    patch({ currentTime: audio.currentTime })
    getLatest().options.onProgress?.(getAudioInfo())
    persistNow()
  }, [getLatest, audioRef, patch, getAudioInfo, persistNow])

  const onProgress = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    try {
      const buffered = audio.buffered
      if (buffered.length > 0 && audio.duration > 0) {
        patch({ buffered: buffered.end(buffered.length - 1) / audio.duration })
      }
    } catch {
      // some implementations throw on empty ranges — ignore
    }
  }, [audioRef, patch])

  const onSeeked = useCallback(() => {
    const audio = audioRef.current
    if (audio) patch({ currentTime: audio.currentTime })
    getLatest().options.onSeeked?.(getAudioInfo())
    if (audio) lyric.seek(audio.currentTime * 1000)
  }, [getLatest, audioRef, patch, getAudioInfo, lyric])

  const onVolumeChange = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    // mirror muted only; the slider is state-driven, fades own the gain
    if (audio.muted !== getLatest().state.muted) {
      patch({ muted: audio.muted })
      persistNow()
    }
  }, [getLatest, audioRef, patch, persistNow])

  const onAbort = useCallback(() => {
    getLatest().options.onAbort?.(getAudioInfo())
  }, [getLatest, getAudioInfo])

  const onRateChange = useCallback(() => {
    const audio = audioRef.current
    if (audio) patch({ playbackRate: audio.playbackRate })
  }, [audioRef, patch])

  return {
    onLoadedMetadata,
    onCanPlay,
    onPlay,
    onPause,
    onTimeUpdate,
    onProgress,
    onEnded,
    onError,
    onSeeked,
    onVolumeChange,
    onAbort,
    onRateChange,
  }
}
