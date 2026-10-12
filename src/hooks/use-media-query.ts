import { useSyncExternalStore } from 'react'

const subscribeNoop = () => () => {}
const getServerSnapshot = () => false

/**
 * Tracks whether `query` matches via `useSyncExternalStore`.
 * `null` disables the query (always `false`, no subscription);
 * SSR snapshot is `false`.
 */
export function useMediaQuery(query: string | null): boolean {
  return useSyncExternalStore(
    query === null
      ? subscribeNoop
      : (onStoreChange) => {
          const mql = window.matchMedia(query)
          mql.addEventListener('change', onStoreChange)
          return () => mql.removeEventListener('change', onStoreChange)
        },
    query === null ? getServerSnapshot : () => window.matchMedia(query).matches,
    getServerSnapshot,
  )
}
