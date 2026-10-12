import { en_GB } from './en-gb'
import { en_US } from './en-us'
import { zh_CN } from './zh-cn'
import type { Locale, LocaleId } from './types'

export * from './types'
export { en_US, en_GB, zh_CN }

/** All built-in locales keyed by id. */
export const locales: Record<LocaleId, Locale> = { en_US, en_GB, zh_CN }

/** Merges `partial` over `base` (defaults to en_US). */
export const createLocale = (
  partial: Partial<Locale>,
  base: Locale = locales.en_US,
): Locale => ({
  ...base,
  ...partial,
  playMode: { ...base.playMode, ...partial.playMode },
})

/** Resolves a locale id or partial overrides into a complete Locale. */
export const resolveLocale = (
  input: LocaleId | Partial<Locale> | undefined,
): Locale => {
  if (input === undefined) return locales.en_US
  if (typeof input === 'string') return locales[input]
  return createLocale(input)
}
