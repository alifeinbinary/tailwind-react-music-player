import { MEDIA_QUERY } from '../constants'
import type { ResolvedTheme, Theme } from '../types'
import { useMediaQuery } from './use-media-query'

/**
 * Resolves a `Theme` to a concrete `'dark' | 'light'`; `'auto'` follows
 * `prefers-color-scheme: dark`.
 */
export function useResolvedTheme(theme: Theme): ResolvedTheme {
  const systemDark = useMediaQuery(
    theme === 'auto' ? MEDIA_QUERY.DARK_SCHEME : null,
  )
  if (theme === 'auto') return systemDark ? 'dark' : 'light'
  return theme
}
