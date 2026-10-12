import * as lib from './index'
import { MusicPlayer } from './components/music-player'

describe('package entry point', () => {
  it('default export is MusicPlayer', () => {
    expect(lib.default).toBe(MusicPlayer)
    expect(typeof lib.default).toBe('function')
  })

  it('exports the public surface', () => {
    for (const key of [
      'MusicPlayer',
      'useMusicPlayer',
      'useKeyboardShortcuts',
      'locales',
      'createLocale',
      'resolveLocale',
      'defaultIcons',
      'PLAY_MODES',
      'THEMES',
      'PLAYER_MODES',
      'MEDIA_QUERY',
      'TIMING',
      'parseLrc',
      'formatTime',
    ]) {
      expect((lib as Record<string, unknown>)[key]).toBeDefined()
    }
  })
})
