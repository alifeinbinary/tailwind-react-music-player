import { useEffect } from 'react'
import type { RefObject } from 'react'
import { DEFAULT_SKIP_SECONDS } from '../constants'
import {
  applyMetadata,
  applyPositionState,
  bindActionHandlers,
} from '../core/media-session'
import type { PlaylistItem } from '../types'

/** Options for {@link useMediaSession}. */
export interface UseMediaSessionOptions {
  enabled: boolean
  track: PlaylistItem | null
  /** Current playback position snapshot — republished whenever it changes. */
  position: { duration: number; position: number; playbackRate: number }
  actions: {
    play(): void
    pause(): void
    next(): void
    prev(): void
    seek(seconds: number): void
    seekBy(seconds: number): void
  }
  audioRef: RefObject<HTMLAudioElement | null>
}

const text = (v: unknown): string =>
  typeof v === 'string' ? v : v == null ? '' : String(v)

const getSession = (enabled: boolean): MediaSession | undefined =>
  enabled && typeof navigator !== 'undefined'
    ? navigator.mediaSession
    : undefined

/**
 * Publishes track metadata, playback position and action handlers to
 * `navigator.mediaSession` while `enabled`.
 */
export function useMediaSession({
  enabled,
  track,
  position,
  actions,
  audioRef,
}: UseMediaSessionOptions): void {
  // metadata on track change
  useEffect(() => {
    const session = getSession(enabled)
    if (!session) return undefined
    if (!track) {
      applyMetadata(session, null)
      return undefined
    }
    applyMetadata(session, {
      title: text(track.name),
      artist: text(track.singer),
      artwork: track.cover,
    })
    return () => {
      applyMetadata(session, null)
    }
  }, [enabled, track])

  // position state follows the latest snapshot
  useEffect(() => {
    const session = getSession(enabled)
    if (session) applyPositionState(session, position)
  }, [enabled, position])

  // action handlers
  useEffect(() => {
    const session = getSession(enabled)
    if (!session) return undefined
    return bindActionHandlers(session, {
      play: () => actions.play(),
      pause: () => actions.pause(),
      previoustrack: () => actions.prev(),
      nexttrack: () => actions.next(),
      seekbackward: () => actions.seekBy(-DEFAULT_SKIP_SECONDS),
      seekforward: () => actions.seekBy(DEFAULT_SKIP_SECONDS),
      seekto: (details) => {
        const audio = audioRef.current
        if (details.seekTime === undefined) return
        if (audio && details.fastSeek && 'fastSeek' in audio) {
          try {
            audio.fastSeek(details.seekTime)
            return
          } catch {
            // fall through to currentTime
          }
        }
        actions.seek(details.seekTime)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers bind once; actions/audioRef are stable parent-owned refs
  }, [enabled])
}
