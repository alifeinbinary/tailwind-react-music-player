import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyMetadata,
  applyPositionState,
  bindActionHandlers,
  buildMediaMetadata,
  guessImageMime,
  type TrackMetadata,
} from './media-session'

interface FakeSession {
  metadata: unknown
  setPositionState?: (state: unknown) => void
  setActionHandler: (action: string, handler: unknown) => void
  handlers: Map<string, unknown>
}

const fakeSession = (): FakeSession => {
  const handlers = new Map<string, unknown>()
  const session: FakeSession = {
    metadata: null,
    handlers,
    setActionHandler(action, handler) {
      if (action === 'seekto') throw new TypeError('unsupported')
      handlers.set(action, handler)
    },
  }
  return session
}

describe('guessImageMime', () => {
  it.each([
    ['a.png', 'image/png'],
    ['a.jpg', 'image/jpeg'],
    ['a.jpeg', 'image/jpeg'],
    ['a.webp', 'image/webp'],
    ['a.gif', 'image/gif'],
    ['a.avif', 'image/avif'],
    ['a.svg', 'image/svg+xml'],
    ['a.PNG', 'image/png'],
    ['https://x/a.jpg?v=2#frag', 'image/jpeg'],
    ['a.bmp', undefined],
    ['a', undefined],
    ['https://x/path/', undefined],
    ['a.png.extra', undefined],
  ])('guessImageMime(%s) === %s', (url, expected) => {
    expect(guessImageMime(url)).toBe(expected)
  })
})

describe('buildMediaMetadata', () => {
  const meta: TrackMetadata = {
    title: 'Song',
    artist: 'Artist',
    album: 'Album',
    artwork: 'https://x/cover.png',
  }

  it('builds a full init with a single artwork entry', () => {
    expect(buildMediaMetadata(meta)).toEqual({
      title: 'Song',
      artist: 'Artist',
      album: 'Album',
      artwork: [{ src: 'https://x/cover.png', type: 'image/png' }],
    })
  })

  it('omits type when the extension is unknown', () => {
    const init = buildMediaMetadata({ ...meta, artwork: 'https://x/cover' })
    expect(init.artwork).toEqual([{ src: 'https://x/cover' }])
  })

  it('omits artwork entirely when absent and defaults artist/album', () => {
    expect(buildMediaMetadata({ title: 'T' })).toEqual({
      title: 'T',
      artist: '',
      album: '',
    })
  })
})

describe('applyMetadata', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sets and clears metadata via MediaMetadata', () => {
    const ctor = vi.fn(function (this: { init: unknown }, init: unknown) {
      this.init = init
    })
    vi.stubGlobal('MediaMetadata', ctor)
    const session = fakeSession()
    applyMetadata(session as unknown as MediaSession, {
      title: 'T',
      artwork: 'a.png',
    })
    expect(ctor).toHaveBeenCalledOnce()
    expect(session.metadata).toEqual({
      init: {
        title: 'T',
        artist: '',
        album: '',
        artwork: [{ src: 'a.png', type: 'image/png' }],
      },
    })
    applyMetadata(session as unknown as MediaSession, null)
    expect(session.metadata).toBeNull()
  })

  it('is a no-op when MediaMetadata is undefined', () => {
    vi.stubGlobal('MediaMetadata', undefined)
    const session = fakeSession()
    applyMetadata(session as unknown as MediaSession, { title: 'T' })
    expect(session.metadata).toBeNull()
  })
})

describe('applyPositionState', () => {
  it('is a no-op without setPositionState', () => {
    const session = fakeSession()
    expect(() =>
      applyPositionState(session as unknown as MediaSession, {
        duration: 10,
        position: 5,
      }),
    ).not.toThrow()
  })

  it('passes sanitised state through', () => {
    const session = fakeSession()
    const spy = vi.fn()
    session.setPositionState = spy
    applyPositionState(session as unknown as MediaSession, {
      duration: 10,
      position: 5,
      playbackRate: 1.5,
    })
    expect(spy).toHaveBeenCalledWith({
      duration: 10,
      position: 5,
      playbackRate: 1.5,
    })
  })

  it.each([
    [
      { duration: NaN, position: 5 },
      { duration: 0, position: 0, playbackRate: 1 },
    ],
    [
      { duration: 10, position: -3 },
      { duration: 10, position: 0, playbackRate: 1 },
    ],
    [
      { duration: 10, position: 99 },
      { duration: 10, position: 10, playbackRate: 1 },
    ],
    [
      { duration: Infinity, position: NaN },
      { duration: 0, position: 0, playbackRate: 1 },
    ],
    [
      { duration: 10, position: 5, playbackRate: NaN },
      { duration: 10, position: 5, playbackRate: 1 },
    ],
  ])('sanitises %j to %j', (input, expected) => {
    const session = fakeSession()
    const spy = vi.fn()
    session.setPositionState = spy
    applyPositionState(session as unknown as MediaSession, input)
    expect(spy).toHaveBeenCalledWith(expected)
  })

  it('swallows TypeError from the UA', () => {
    const session = fakeSession()
    session.setPositionState = () => {
      throw new TypeError('invalid')
    }
    expect(() =>
      applyPositionState(session as unknown as MediaSession, {
        duration: 1,
        position: 1,
      }),
    ).not.toThrow()
  })
})

describe('bindActionHandlers', () => {
  it('binds supported handlers and unbinds them', () => {
    const session = fakeSession()
    const onPlay = vi.fn()
    const unbind = bindActionHandlers(session as unknown as MediaSession, {
      play: onPlay,
      pause: vi.fn(),
    })
    expect(session.handlers.get('play')).toBe(onPlay)
    expect(session.handlers.get('pause')).toBeInstanceOf(Function)
    unbind()
    expect(session.handlers.get('play')).toBeNull()
    expect(session.handlers.get('pause')).toBeNull()
  })

  it('binds an explicit undefined handler as null', () => {
    const session = fakeSession()
    bindActionHandlers(session as unknown as MediaSession, {
      play: undefined,
    })
    expect(session.handlers.get('play')).toBeNull()
  })

  it('skips unsupported actions without throwing', () => {
    const session = fakeSession()
    const unbind = bindActionHandlers(session as unknown as MediaSession, {
      play: vi.fn(),
      seekto: vi.fn(),
    })
    expect(session.handlers.has('seekto')).toBe(false)
    expect(() => unbind()).not.toThrow()
    expect(session.handlers.get('play')).toBeNull()
  })
})
