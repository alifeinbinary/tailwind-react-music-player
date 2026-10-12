import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** Semantic handlers invoked for each bound media event. */
export interface AudioEventHandlers {
  onLoadedMetadata(): void
  onCanPlay(): void
  onPlay(): void
  onPause(): void
  onTimeUpdate(): void
  onProgress(): void
  onEnded(): void
  onError(): void
  onSeeked(): void
  onVolumeChange(): void
  onAbort(): void
  onRateChange(): void
}

const EVENT_MAP: [string, keyof AudioEventHandlers][] = [
  ['loadedmetadata', 'onLoadedMetadata'],
  ['durationchange', 'onLoadedMetadata'],
  ['canplay', 'onCanPlay'],
  ['play', 'onPlay'],
  ['playing', 'onPlay'],
  ['pause', 'onPause'],
  ['timeupdate', 'onTimeUpdate'],
  ['progress', 'onProgress'],
  ['ended', 'onEnded'],
  ['error', 'onError'],
  ['seeked', 'onSeeked'],
  ['volumechange', 'onVolumeChange'],
  ['abort', 'onAbort'],
  ['ratechange', 'onRateChange'],
]

/**
 * Binds all media events on the `<audio>` element. Returns a ref
 * callback: on attach every listener is bound (dispatching to the
 * latest handlers) and `muted` is synced; on detach/rebind/unmount all
 * listeners are removed. This hook has no playlist knowledge.
 */
export function useAudioEvents(
  audioRef: RefObject<HTMLAudioElement | null>,
  handlers: AudioEventHandlers,
  initialMuted: () => boolean,
): (el: HTMLAudioElement | null) => void {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })
  const unbindRef = useRef<(() => void) | null>(null)

  useEffect(
    () => () => {
      unbindRef.current?.()
    },
    [],
  )

  return useCallback(
    (el: HTMLAudioElement | null) => {
      unbindRef.current?.()
      unbindRef.current = null
      audioRef.current = el
      if (!el) return
      const bound: [string, () => void][] = EVENT_MAP.map(([type, key]) => {
        const fn = () => handlersRef.current[key]()
        el.addEventListener(type, fn)
        return [type, fn]
      })
      el.muted = initialMuted()
      unbindRef.current = () => {
        for (const [type, fn] of bound) {
          el.removeEventListener(type, fn)
        }
      }
    },
    [audioRef, initialMuted],
  )
}
