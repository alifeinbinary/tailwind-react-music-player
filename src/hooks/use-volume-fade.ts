import { useCallback, useEffect, useRef } from 'react'
import { createFade, sliderToGain } from '../core'
import type { FadeHandle } from '../core/volume-fade'
import { isIOS } from './platform'
import type { PlayerContext } from './player-context'

/** Playback/volume-fade API returned by {@link useVolumeFade}. */
export interface VolumeFadeApi {
  playImpl(): Promise<void>
  pauseImpl(): void
  togglePlay(): void
  /** Cancels the active fade; optionally restores the slider gain. */
  cancelFade(restoreGain: boolean): void
  /** Applies the gain for a slider value (retargets an in-flight fade-in). */
  applyVolumeGain(slider: number): void
}

/**
 * Owns the audio gain: slider→gain mapping, fade-in/out on play/pause
 * with mid-fade reversal, iOS fade skipping and fade cancellation.
 */
export function useVolumeFade(
  ctx: PlayerContext,
  volume: number,
): VolumeFadeApi {
  const { getLatest, audioRef, pendingPlayRef, patch } = ctx
  const fadeRef = useRef<FadeHandle | null>(null)

  const cancelFade = useCallback(
    (restoreGain: boolean) => {
      const fade = fadeRef.current
      fadeRef.current = null
      if (fade) {
        fade.cancel()
        const audio = audioRef.current
        if (restoreGain && audio && !isIOS()) {
          audio.volume = sliderToGain(getLatest().volume)
        }
      }
      patch({ fading: null })
    },
    [audioRef, getLatest, patch],
  )

  const startFade = useCallback(
    (
      direction: 'in' | 'out',
      targetGain: number,
      durationMs: number,
      onDone?: () => void,
    ): boolean => {
      const audio = audioRef.current
      if (!audio || isIOS() || durationMs <= 0) return false
      fadeRef.current?.cancel()
      const from = audio.volume
      patch({ fading: direction })
      const fade = createFade(
        (gain) => {
          const el = audioRef.current
          if (el) el.volume = gain
        },
        { from, to: targetGain, durationMs },
      )
      fadeRef.current = fade
      void fade.done.then((outcome) => {
        if (fadeRef.current === fade) fadeRef.current = null
        patch({ fading: null })
        if (outcome === 'completed') onDone?.()
      })
      return true
    },
    [audioRef, patch],
  )

  const playImpl = useCallback(async (): Promise<void> => {
    const l = getLatest()
    const audio = audioRef.current
    if (l.index < 0 || !l.track) return
    if (!l.state.src || !audio) {
      pendingPlayRef.current = true
      return
    }
    const fadeIn = l.options.volumeFade?.fadeIn ?? 0
    try {
      if (!isIOS() && fadeIn > 0) {
        audio.volume = 0
      }
      await audio.play()
      if (!isIOS() && fadeIn > 0) {
        startFade('in', sliderToGain(l.volume), fadeIn)
      }
    } catch {
      // play() rejected (e.g. no gesture) — settle to paused
      patch({ status: 'paused' })
    }
  }, [getLatest, audioRef, pendingPlayRef, startFade, patch])

  const pauseImpl = useCallback((): void => {
    const l = getLatest()
    const audio = audioRef.current
    const fadeOut = l.options.volumeFade?.fadeOut ?? 0
    if (audio && !isIOS() && fadeOut > 0 && !audio.paused) {
      const gain = audio.volume
      const finished = startFade('out', 0, fadeOut, () => {
        audio.pause()
        if (!isIOS()) audio.volume = gain
      })
      if (finished) return
    }
    audio?.pause()
  }, [getLatest, audioRef, startFade])

  const togglePlay = useCallback(() => {
    const l = getLatest()
    const audio = audioRef.current
    // reverse an in-flight fade instead of starting over
    if (l.state.fading === 'in') {
      pauseImpl()
      return
    }
    if (l.state.fading === 'out') {
      void playImpl()
      return
    }
    if (audio?.paused === false) {
      pauseImpl()
    } else {
      void playImpl()
    }
  }, [getLatest, audioRef, playImpl, pauseImpl])

  const applyVolumeGain = useCallback(
    (slider: number) => {
      const audio = audioRef.current
      const fade = fadeRef.current
      if (fade?.active && getLatest().state.fading === 'in') {
        fade.retarget(sliderToGain(slider))
      } else if (audio && !isIOS()) {
        audio.volume = sliderToGain(slider)
      }
    },
    [audioRef, getLatest],
  )

  // volume -> gain (slider owns it unless a fade is in-flight)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isIOS()) return
    const fade = fadeRef.current
    if (fade?.active && getLatest().state.fading === 'in') {
      fade.retarget(sliderToGain(volume))
      return
    }
    audio.volume = sliderToGain(volume)
  }, [audioRef, getLatest, volume])

  // cancel fades on unmount
  useEffect(
    () => () => {
      fadeRef.current?.cancel()
    },
    [],
  )

  return { playImpl, pauseImpl, togglePlay, cancelFade, applyVolumeGain }
}
