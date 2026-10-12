import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import type { RefObject } from 'react'
import { DEFAULT_SKIP_SECONDS } from '../constants'
import type { PlaylistItem } from '../types'
import { useMediaSession } from './use-media-session'
import { isIOS } from './platform'

class FakeMediaMetadata {
  constructor(public init: unknown) {}
}

interface FakeSession {
  metadata: unknown
  setPositionState: ReturnType<typeof vi.fn>
  setActionHandler: ReturnType<typeof vi.fn>
}

const setupSession = (): FakeSession => {
  const session: FakeSession = {
    metadata: null,
    setPositionState: vi.fn(),
    setActionHandler: vi.fn(),
  }
  Object.defineProperty(navigator, 'mediaSession', {
    configurable: true,
    value: session,
  })
  vi.stubGlobal('MediaMetadata', FakeMediaMetadata)
  return session
}

const track: PlaylistItem = {
  id: 't1',
  name: 'Song',
  singer: 'Artist',
  cover: 'https://x/cover.png',
  musicSrc: 'https://x/a.mp3',
}

const position = { duration: 180, position: 30, playbackRate: 1 }

const actions = () => ({
  play: vi.fn(),
  pause: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  seek: vi.fn(),
  seekBy: vi.fn(),
})

describe('useMediaSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'mediaSession')
  })

  it('applies metadata and position state when enabled', () => {
    const session = setupSession()
    renderHook(() =>
      useMediaSession({
        enabled: true,
        track,
        position,
        actions: actions(),
        audioRef: createRef(),
      }),
    )
    expect(session.metadata).toEqual(
      expect.objectContaining({
        init: expect.objectContaining({ title: 'Song', artist: 'Artist' }),
      }),
    )
    expect(session.setPositionState).toHaveBeenCalledWith(
      expect.objectContaining({ position: 30 }),
    )
  })

  it('binds action handlers and unbinds them on cleanup', () => {
    const session = setupSession()
    const a = actions()
    const audioRef: RefObject<HTMLAudioElement | null> = {
      current: document.createElement('audio'),
    }
    const { unmount } = renderHook(() =>
      useMediaSession({ enabled: true, track, position, actions: a, audioRef }),
    )
    const bound = Object.fromEntries(
      session.setActionHandler.mock.calls.map(([name, fn]) => [name, fn]),
    ) as Record<string, (d?: unknown) => void>
    bound.play?.()
    bound.pause?.()
    bound.previoustrack?.()
    bound.nexttrack?.()
    expect(a.play).toHaveBeenCalled()
    expect(a.pause).toHaveBeenCalled()
    expect(a.prev).toHaveBeenCalled()
    expect(a.next).toHaveBeenCalled()
    bound.seekbackward?.()
    bound.seekforward?.()
    expect(a.seekBy).toHaveBeenNthCalledWith(1, -DEFAULT_SKIP_SECONDS)
    expect(a.seekBy).toHaveBeenNthCalledWith(2, DEFAULT_SKIP_SECONDS)
    bound.seekto?.({ seekTime: 42 })
    expect(a.seek).toHaveBeenCalledWith(42)

    unmount()
    const cleared = Object.fromEntries(
      session.setActionHandler.mock.calls.filter(([, fn]) => fn === null) as [
        string,
        null,
      ][],
    )
    for (const name of [
      'play',
      'pause',
      'previoustrack',
      'nexttrack',
      'seekbackward',
      'seekforward',
      'seekto',
    ]) {
      expect(cleared[name]).toBeNull()
    }
    expect(session.metadata).toBeNull()
  })

  it('uses fastSeek on seekto when requested and available', () => {
    setupSession()
    const a = actions()
    const audio = document.createElement('audio')
    const fastSeek = vi.fn()
    Object.assign(audio, { fastSeek })
    const audioRef: RefObject<HTMLAudioElement | null> = { current: audio }
    renderHook(() =>
      useMediaSession({ enabled: true, track, position, actions: a, audioRef }),
    )
    const seekto = (
      navigator.mediaSession.setActionHandler as ReturnType<typeof vi.fn>
    ).mock.calls.find(([n]) => n === 'seekto')?.[1] as (d: unknown) => void
    seekto({ seekTime: 10, fastSeek: true })
    expect(fastSeek).toHaveBeenCalledWith(10)
    expect(a.seek).not.toHaveBeenCalled()
  })

  it('stringifies non-string metadata and tolerates missing fields', () => {
    const session = setupSession()
    renderHook(() =>
      useMediaSession({
        enabled: true,
        track: { ...track, name: 42, singer: undefined, cover: undefined },
        position,
        actions: actions(),
        audioRef: createRef(),
      }),
    )
    expect(session.metadata).toEqual(
      expect.objectContaining({
        init: expect.objectContaining({ title: '42' }),
      }),
    )
  })

  it('clears metadata when there is no track', () => {
    const session = setupSession()
    renderHook(() =>
      useMediaSession({
        enabled: true,
        track: null,
        position,
        actions: actions(),
        audioRef: createRef(),
      }),
    )
    expect(session.metadata).toBeNull()
  })

  it('is a no-op when disabled', () => {
    const session = setupSession()
    renderHook(() =>
      useMediaSession({
        enabled: false,
        track,
        position,
        actions: actions(),
        audioRef: createRef(),
      }),
    )
    expect(session.metadata).toBeNull()
    expect(session.setActionHandler).not.toHaveBeenCalled()
  })
})

describe('isIOS', () => {
  it('detects iOS user agents and iPadOS-as-macOS', () => {
    const ua = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent')
    expect(isIOS()).toBe(false)
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    )
    expect(isIOS()).toBe(true)
    vi.restoreAllMocks()
    if (ua) {
      Object.defineProperty(window.navigator, 'userAgent', ua)
    }
  })

  it('detects iPadOS masquerading as macOS', () => {
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel')
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      get: () => 5,
    })
    expect(isIOS()).toBe(true)
    vi.restoreAllMocks()
    Reflect.deleteProperty(window.navigator, 'maxTouchPoints')
    expect(isIOS()).toBe(false)
  })
})
