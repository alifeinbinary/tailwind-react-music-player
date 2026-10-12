import { useCallback, useEffect, useMemo, useRef } from 'react'
import { createLyricScheduler, parseLrc } from '../core'
import type { LyricLine, LyricScheduler } from '../core/lyric-parser'
import type { PlaylistItem } from '../types'
import type { PlayerContext } from './player-context'

/** Lyric synchronisation API returned by {@link useLyricSync}. */
export interface LyricSyncApi {
  /** Parsed lines of the current track. */
  lines: readonly LyricLine[]
  /** Re-anchors playback position and schedules upcoming lines. */
  play(fromMs?: number): void
  pause(): void
  seek(toMs: number): void
  stop(): void
}

/**
 * Parses the current track's `lyric` and owns a lyric scheduler driven
 * by play/pause/seeked/ended calls from the media event layer. Emits
 * `onLyricChange` and updates `lyricIndex`/`currentLyric` in state.
 */
export function useLyricSync(
  ctx: PlayerContext,
  track: PlaylistItem | null,
): LyricSyncApi {
  const { getLatest, patch } = ctx
  const schedulerRef = useRef<LyricScheduler | null>(null)

  const lines = useMemo(
    () => (track?.lyric ? parseLrc(track.lyric).lines : []),
    [track],
  )

  useEffect(() => {
    const scheduler = createLyricScheduler(lines, (line, i) => {
      patch({ lyricIndex: i })
      getLatest().options.onLyricChange?.(line.text, i)
    })
    schedulerRef.current = scheduler
    return () => {
      scheduler.stop()
      if (schedulerRef.current === scheduler) {
        schedulerRef.current = null
      }
    }
  }, [getLatest, lines, patch])

  const play = useCallback((fromMs?: number) => {
    schedulerRef.current?.play(fromMs)
  }, [])
  const pause = useCallback(() => {
    schedulerRef.current?.pause()
  }, [])
  const seek = useCallback((toMs: number) => {
    schedulerRef.current?.seek(toMs)
  }, [])
  const stop = useCallback(() => {
    schedulerRef.current?.stop()
  }, [])

  return { lines, play, pause, seek, stop }
}
