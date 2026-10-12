import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a stable function identity that always invokes the latest
 * `fn`. The ref is updated in an effect so render stays pure.
 */
export function useEventCallback<A extends unknown[], R>(
  fn: (...args: A) => R,
): (...args: A) => R {
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  return useCallback((...args: A) => ref.current(...args), [])
}
