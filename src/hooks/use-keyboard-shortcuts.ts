import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** Handlers invoked by the player keyboard shortcuts. */
export interface KeyboardShortcutHandlers {
  togglePlay(): void
  seekBy(seconds: number): void
  volumeBy(delta: number): void
  toggleMute(): void
  next(): void
  prev(): void
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Binds `keydown` on `target`: space toggles play, arrows seek/adjust
 * volume, `m` mutes, `n`/`p` switch tracks. Events from editable
 * elements and already-handled events are ignored.
 */
export function useKeyboardShortcuts(
  target: RefObject<HTMLElement | null>,
  handlers: KeyboardShortcutHandlers,
  enabled: boolean,
): void {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    const el = target.current
    if (!enabled || !el) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return
      const h = handlersRef.current
      switch (event.key) {
        case ' ':
        case 'Space':
          event.preventDefault()
          h.togglePlay()
          break
        case 'ArrowLeft':
          event.preventDefault()
          h.seekBy(-5)
          break
        case 'ArrowRight':
          event.preventDefault()
          h.seekBy(5)
          break
        case 'ArrowUp':
          event.preventDefault()
          h.volumeBy(0.1)
          break
        case 'ArrowDown':
          event.preventDefault()
          h.volumeBy(-0.1)
          break
        case 'm':
          h.toggleMute()
          break
        case 'n':
          h.next()
          break
        case 'p':
          h.prev()
          break
        default:
          break
      }
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [target, enabled])
}
