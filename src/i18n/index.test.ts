import { createLocale, en_US, en_GB, resolveLocale, zh_CN } from '.'
import type { Locale } from './types'

describe('i18n', () => {
  it('every built-in locale defines every Locale key', () => {
    const keys = Object.keys(en_US) as (keyof Locale)[]
    for (const locale of [en_US, en_GB, zh_CN]) {
      for (const key of keys) {
        expect(locale[key], `${key} missing`).toBeDefined()
      }
      expect(Object.keys(locale.playMode).sort()).toEqual(
        ['order', 'orderLoop', 'shufflePlay', 'singleLoop'].sort(),
      )
    }
  })

  it('createLocale merges partial overrides over the base', () => {
    const custom = createLocale({ play: 'GO' })
    const withMode = createLocale({
      playMode: { ...en_US.playMode, order: 'seq' },
    })
    expect(custom.play).toBe('GO')
    expect(custom.pause).toBe(en_US.pause)
    expect(withMode.playMode.order).toBe('seq')
    expect(withMode.playMode.shufflePlay).toBe(en_US.playMode.shufflePlay)
  })

  it('resolveLocale handles ids, partials and undefined', () => {
    expect(resolveLocale('zh_CN')).toBe(zh_CN)
    expect(resolveLocale(undefined)).toBe(en_US)
    expect(resolveLocale({ play: 'X' }).play).toBe('X')
  })

  it('function-valued keys produce strings', () => {
    expect(en_US.playlistCount(3)).toBe('Playlist (3)')
    expect(en_US.removeTrack('song')).toBe('Remove song')
    expect(en_US.nowPlaying('song')).toBe('Now playing song')
  })
})
