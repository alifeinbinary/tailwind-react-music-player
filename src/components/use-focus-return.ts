import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/**
 * Moves focus into `target` when `active` becomes true and returns it to
 * the previously-focused element when it turns false (or on unmount).
 */
export function useFocusReturn(
  target: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  const previous = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (active) {
      previous.current = document.activeElement as HTMLElement | null
      target.current?.focus()
    } else if (previous.current) {
      if (previous.current.isConnected) previous.current.focus()
      previous.current = null
    }
  }, [target, active])
  useEffect(
    () => () => {
      // The element may have been remounted (e.g. the mini controller is
      // a fresh DOM node after a mode switch) — only refocus a live node.
      if (previous.current?.isConnected) previous.current.focus()
      previous.current = null
    },
    [],
  )
}
