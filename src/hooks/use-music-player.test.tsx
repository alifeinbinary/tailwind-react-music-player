import { act } from 'react'
import { TIMING } from '../constants'
import { installFakeMedia } from '../test/fake-media'
import type { FakeMediaController } from '../test/fake-media'
import { flushMicrotasks, renderPlayerHook } from '../test/render-player'
import type { AudioTrack, UseMusicPlayerOptions } from '../types'

const tracks = (n: number): AudioTrack[] =>
  Array.from({ length: n }, (_, i) => ({
    name: `T${i}`,
    musicSrc: `https://x/${i}.mp3`,
  }))

let media: FakeMediaController

beforeEach(() => {
  media = installFakeMedia()
})

afterEach(() => {
  media.restore()
  vi.useRealTimers()
  localStorage.clear()
})

const opts = (overrides: Partial<UseMusicPlayerOptions> = {}) => ({
  audioLists: tracks(3),
  ...overrides,
})

/** Renders + flushes the async source resolution and canplay microtask. */
const setup = async (options: Partial<UseMusicPlayerOptions> = {}) => {
  const h = renderPlayerHook(opts(options))
  await flushMicrotasks()
  return h
}

describe('useMusicPlayer — mount', () => {
  it('starts idle with an empty list', async () => {
    const h = await setup({ audioLists: [] })
    expect(h.result().state.status).toBe('idle')
    expect(h.result().state.index).toBe(-1)
    expect(h.result().state.tracks).toHaveLength(0)
  })

  it('assigns ids and resolves the first src', async () => {
    const h = await setup()
    const s = h.result().state
    expect(s.tracks.every((t) => typeof t.id === 'string')).toBe(true)
    expect(s.index).toBe(0)
    expect(s.src).toBe('https://x/0.mp3')
    expect(h.audio().getAttribute('src')).toBe('https://x/0.mp3')
  })

  it('autoPlay: canplay starts playback and fires onPlay', async () => {
    const onPlay = vi.fn()
    const h = await setup({ onPlay })
    expect(h.result().state.status).toBe('playing')
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onPlay).toHaveBeenCalledWith(
      expect.objectContaining({ index: 0, playMode: 'order' }),
    )
  })

  it('autoPlay: false stays paused', async () => {
    const h = await setup({ autoPlay: false })
    expect(h.result().state.status).toBe('paused')
    expect(h.audio().paused).toBe(true)
  })

  it('honours defaultPlayIndex', async () => {
    const h = await setup({ defaultPlayIndex: 2 })
    expect(h.result().state.index).toBe(2)
    expect(h.result().state.src).toBe('https://x/2.mp3')
  })

  it('honours the preload prop', async () => {
    const h = await setup({ preload: 'auto' })
    expect(h.audio().preload).toBe('auto')
  })
})

describe('useMusicPlayer — async musicSrc', () => {
  it('resolves function sources', async () => {
    const h = await setup({
      audioLists: [{ musicSrc: () => Promise.resolve('https://x/async.mp3') }],
    })
    expect(h.result().state.src).toBe('https://x/async.mp3')
    expect(h.result().state.status).toBe('playing')
  })

  it('ignores stale resolutions after switching tracks', async () => {
    let resolve0!: (s: string) => void
    const src0 = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve0 = r
        }),
    )
    const h = await setup({
      audioLists: [{ musicSrc: src0 }, { musicSrc: 'https://x/next.mp3' }],
    })
    act(() => h.result().actions.next())
    await flushMicrotasks()
    act(() => resolve0('https://x/stale.mp3'))
    await flushMicrotasks()
    expect(h.result().state.index).toBe(1)
    expect(h.result().state.src).toBe('https://x/next.mp3')
  })

  it('handles async rejection: error state + onError + skip', async () => {
    const onError = vi.fn()
    const err = new Error('nope')
    const h = await setup({
      onError,
      audioLists: [
        { musicSrc: () => Promise.reject(err) },
        { musicSrc: 'https://x/good.mp3' },
      ],
    })
    expect(onError).toHaveBeenCalledWith(err, expect.anything())
    await flushMicrotasks()
    // skipped to track 1
    expect(h.result().state.index).toBe(1)
    expect(h.result().state.src).toBe('https://x/good.mp3')
  })
})

describe('useMusicPlayer — error events', () => {
  it('skips to next on load error in orderLoop', async () => {
    media.restore()
    media = installFakeMedia({ failPattern: /0\.mp3/ })
    const h = await setup({ defaultPlayMode: 'orderLoop' })
    await flushMicrotasks(6)
    expect(h.result().state.index).toBe(1)
    expect(h.result().state.status).toBe('playing')
  })

  it('stops at the end in order mode', async () => {
    media.restore()
    media = installFakeMedia({ failPattern: /2\.mp3/ })
    const h = await setup({ defaultPlayIndex: 2, defaultPlayMode: 'order' })
    await flushMicrotasks(6)
    expect(h.result().state.index).toBe(2)
    expect(h.result().state.status).toBe('error')
  })

  it('skipOnError: false keeps the errored track', async () => {
    media.restore()
    media = installFakeMedia({ failPattern: /0\.mp3/ })
    const h = await setup({ skipOnError: false })
    await flushMicrotasks(6)
    expect(h.result().state.index).toBe(0)
    expect(h.result().state.status).toBe('error')
  })
})

describe('useMusicPlayer — ended / play modes', () => {
  it('order: advances then stops at the end', async () => {
    const onEnded = vi.fn()
    const h = await setup({ onEnded })
    act(() => media.end(h.audio()))
    expect(onEnded).toHaveBeenCalled()
    await flushMicrotasks()
    expect(h.result().state.index).toBe(1)
    act(() => media.end(h.audio()))
    await flushMicrotasks()
    expect(h.result().state.index).toBe(2)
    act(() => media.end(h.audio()))
    await flushMicrotasks()
    expect(h.result().state.index).toBe(2)
    expect(h.result().state.status).toBe('paused')
  })

  it('orderLoop: wraps around', async () => {
    const h = await setup({ defaultPlayIndex: 2, defaultPlayMode: 'orderLoop' })
    act(() => media.end(h.audio()))
    await flushMicrotasks()
    expect(h.result().state.index).toBe(0)
  })

  it('singleLoop: replays the same track', async () => {
    const h = await setup({ defaultPlayMode: 'singleLoop' })
    act(() => media.end(h.audio()))
    await flushMicrotasks()
    expect(h.result().state.index).toBe(0)
    expect(h.result().state.status).toBe('playing')
    expect(h.audio().currentTime).toBe(0)
  })

  it('shufflePlay: uses the injected random', async () => {
    const random = vi.fn().mockReturnValue(0.99)
    const h = await setup({ defaultPlayMode: 'shufflePlay', random })
    act(() => media.end(h.audio()))
    await flushMicrotasks()
    expect(h.result().state.index).toBe(2) // 0.99 * 3 -> 2
  })
})

describe('useMusicPlayer — navigation', () => {
  it('next/prev wrap in orderLoop', async () => {
    const h = await setup()
    act(() => h.result().actions.next())
    await flushMicrotasks()
    expect(h.result().state.index).toBe(1)
    act(() => h.result().actions.prev())
    await flushMicrotasks()
    expect(h.result().state.index).toBe(0)
    act(() => h.result().actions.prev())
    await flushMicrotasks()
    expect(h.result().state.index).toBe(2)
  })

  it('prev restarts the track past the threshold when restartCurrentOnPrev', async () => {
    const h = await setup({ restartCurrentOnPrev: true })
    act(() => media.advance(h.audio(), 10))
    act(() => h.result().actions.prev())
    expect(h.audio().currentTime).toBe(0)
    expect(h.result().state.index).toBe(0)
  })

  it('playIndex/playId select tracks and fire callbacks', async () => {
    const onPlayIndexChange = vi.fn()
    const onTrackChange = vi.fn()
    const h = await setup({ onPlayIndexChange, onTrackChange })
    onTrackChange.mockClear()
    act(() => h.result().actions.playIndex(2))
    expect(onPlayIndexChange).toHaveBeenCalledWith(2)
    await flushMicrotasks()
    expect(h.result().state.index).toBe(2)
    expect(onTrackChange).toHaveBeenCalledWith(
      expect.objectContaining({ index: 2 }),
    )
    const id = h.result().state.tracks[0].id
    act(() => h.result().actions.playId(id))
    await flushMicrotasks()
    expect(h.result().state.index).toBe(0)
  })

  it('play() and pause() control playback', async () => {
    const h = await setup({ autoPlay: false })
    await act(() => h.result().actions.play())
    expect(h.result().state.status).toBe('playing')
    act(() => h.result().actions.pause())
    expect(h.result().state.status).toBe('paused')
    act(() => h.result().actions.togglePlay())
    expect(h.result().state.status).toBe('playing')
  })

  it('play() before src resolves defers to canplay', async () => {
    let resolve!: (s: string) => void
    const h = renderPlayerHook(
      opts({
        autoPlay: false,
        audioLists: [
          {
            musicSrc: () =>
              new Promise<string>((r) => {
                resolve = r
              }),
          },
        ],
      }),
    )
    await flushMicrotasks()
    await act(async () => {
      await h.result().actions.play()
    })
    act(() => resolve('https://x/late.mp3'))
    await flushMicrotasks()
    expect(h.result().state.status).toBe('playing')
  })

  it('reload re-resolves and fires onReload', async () => {
    const onReload = vi.fn()
    const src = vi.fn().mockResolvedValue('https://x/again.mp3')
    const h = await setup({ onReload, audioLists: [{ musicSrc: src }] })
    expect(src).toHaveBeenCalledTimes(1)
    act(() => h.result().actions.reload())
    expect(onReload).toHaveBeenCalled()
    await flushMicrotasks()
    expect(src).toHaveBeenCalledTimes(2)
    expect(h.result().state.src).toBe('https://x/again.mp3')
  })
})

describe('useMusicPlayer — seek & volume', () => {
  it('seek clamps to duration and fires onSeeked', async () => {
    const onSeeked = vi.fn()
    const h = await setup({ onSeeked })
    act(() => h.result().actions.seek(9999))
    expect(h.audio().currentTime).toBe(180)
    expect(onSeeked).toHaveBeenCalled()
    act(() => h.result().actions.seek(-5))
    expect(h.audio().currentTime).toBe(0)
  })

  it('seekBy clamps', async () => {
    const h = await setup()
    act(() => media.advance(h.audio(), 10))
    act(() => h.result().actions.seekBy(-20))
    expect(h.audio().currentTime).toBe(0)
    act(() => h.result().actions.seekBy(1000))
    expect(h.audio().currentTime).toBe(180)
  })

  it('setVolume applies the squared gain curve', async () => {
    const onVolumeChange = vi.fn()
    const h = await setup({ onVolumeChange })
    act(() => h.result().actions.setVolume(0.5))
    expect(h.audio().volume).toBeCloseTo(0.25)
    expect(onVolumeChange).toHaveBeenCalledWith(0.5)
    act(() => h.result().actions.volumeBy(0.1))
    expect(h.result().state.volume).toBeCloseTo(0.6)
  })

  it('toggleMute keeps the slider value', async () => {
    const h = await setup()
    act(() => h.result().actions.setVolume(0.4))
    act(() => h.result().actions.toggleMute())
    expect(h.result().state.muted).toBe(true)
    expect(h.audio().muted).toBe(true)
    expect(h.result().state.volume).toBeCloseTo(0.4)
    act(() => h.result().actions.toggleMute())
    expect(h.result().state.muted).toBe(false)
  })

  it('supports a controlled volume prop', async () => {
    const onVolumeChange = vi.fn()
    const h = renderPlayerHook(opts({ volume: 0.3, onVolumeChange }))
    await flushMicrotasks()
    act(() => h.result().actions.setVolume(0.8))
    expect(onVolumeChange).toHaveBeenCalledWith(0.8)
    expect(h.result().state.volume).toBeCloseTo(0.3)
    h.rerender(opts({ volume: 0.6, onVolumeChange }))
    expect(h.result().state.volume).toBeCloseTo(0.6)
  })
})

describe('useMusicPlayer — fades', () => {
  it('fades in on play and out on pause', async () => {
    vi.useFakeTimers()
    const h = await setup({ volumeFade: { fadeIn: 100, fadeOut: 100 } })
    expect(h.result().state.fading).toBe('in')
    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(h.result().state.fading).toBeNull()
    expect(h.audio().volume).toBeCloseTo(1)
    act(() => h.result().actions.pause())
    expect(h.result().state.fading).toBe('out')
    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(h.audio().paused).toBe(true)
    expect(h.audio().volume).toBeCloseTo(1) // gain restored after fade-out
  })

  it('reverses a fade mid-transition via togglePlay', async () => {
    vi.useFakeTimers()
    const h = await setup({ volumeFade: { fadeIn: 1000, fadeOut: 1000 } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(h.result().state.fading).toBe('in')
    const midGain = h.audio().volume
    expect(midGain).toBeGreaterThan(0)
    act(() => h.result().actions.togglePlay())
    expect(h.result().state.fading).toBe('out')
    await act(async () => {
      vi.advanceTimersByTime(1500)
    })
    expect(h.audio().paused).toBe(true)
  })

  it('skips fades on iOS', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    )
    const h = await setup({ volumeFade: { fadeIn: 500, fadeOut: 500 } })
    expect(h.result().state.fading).toBeNull()
    vi.restoreAllMocks()
  })
})

describe('useMusicPlayer — controlled props', () => {
  it('controlled playIndex drives selection', async () => {
    const onPlayIndexChange = vi.fn()
    const h = renderPlayerHook(opts({ playIndex: 0, onPlayIndexChange }))
    await flushMicrotasks()
    h.rerender(opts({ playIndex: 1, onPlayIndexChange }))
    await flushMicrotasks()
    expect(h.result().state.index).toBe(1)
    expect(h.result().state.src).toBe('https://x/1.mp3')
    // action only fires onChange — parent decides
    act(() => h.result().actions.next())
    expect(onPlayIndexChange).toHaveBeenCalledWith(2)
    expect(h.result().state.index).toBe(1)
    await flushMicrotasks()
  })

  it('controlled playMode and theme', async () => {
    const onPlayModeChange = vi.fn()
    const onThemeChange = vi.fn()
    const h = await setup({
      playMode: 'singleLoop',
      onPlayModeChange,
      theme: 'light',
      onThemeChange,
    })
    expect(h.result().state.playMode).toBe('singleLoop')
    expect(h.result().state.theme).toBe('light')
    act(() => h.result().actions.cyclePlayMode())
    expect(onPlayModeChange).toHaveBeenCalledWith('shufflePlay')
    expect(h.result().state.playMode).toBe('singleLoop')
    act(() => h.result().actions.setTheme('dark'))
    expect(onThemeChange).toHaveBeenCalledWith('dark')
    expect(h.result().state.theme).toBe('light')
  })

  it('cyclePlayMode and toggles work uncontrolled', async () => {
    const h = await setup()
    act(() => h.result().actions.cyclePlayMode())
    expect(h.result().state.playMode).toBe('orderLoop')
    act(() => h.result().actions.toggleTheme())
    expect(h.result().state.theme).toBe('light')
    act(() => h.result().actions.toggleMode())
    expect(h.result().state.mode).toBe('mini')
  })
})

describe('useMusicPlayer — track list updates', () => {
  it('merges new tracks by default, keeping the current track', async () => {
    const h = await setup()
    const onTracksChange = vi.fn()
    h.rerender(opts({ onTracksChange, audioLists: tracks(4) }))
    const s = h.result().state
    expect(s.tracks).toHaveLength(4)
    expect(s.index).toBe(0)
    expect(s.status).toBe('playing')
    expect(onTracksChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String) }),
      ]),
      expect.anything(),
    )
  })

  it('replaces the list when replaceListOnUpdate', async () => {
    const h = await setup()
    const replacement: AudioTrack[] = [
      { musicSrc: 'https://y/a.mp3' },
      { musicSrc: 'https://y/b.mp3' },
    ]
    h.rerender(opts({ replaceListOnUpdate: true, audioLists: replacement }))
    await flushMicrotasks()
    const s = h.result().state
    expect(s.tracks).toHaveLength(2)
    expect(s.index).toBe(0)
    expect(s.src).toBe('https://y/a.mp3')
  })

  it('preserves the current track across replace when preserveCurrentOnUpdate', async () => {
    const h = await setup()
    act(() => h.result().actions.playIndex(1))
    await flushMicrotasks()
    const keepId = h.result().state.tracks[1].id
    const replacement: AudioTrack[] = [
      { musicSrc: 'https://y/a.mp3' },
      tracks(3)[1], // same musicSrc -> id reused
    ]
    h.rerender(
      opts({
        replaceListOnUpdate: true,
        preserveCurrentOnUpdate: true,
        audioLists: replacement,
      }),
    )
    await flushMicrotasks()
    const s = h.result().state
    expect(s.index).toBe(1)
    expect(s.track?.id).toBe(keepId)
    expect(s.src).toBe('https://x/1.mp3')
  })

  it('autoPlayOnListUpdate drives pending play on replace', async () => {
    const h = await setup({
      replaceListOnUpdate: true,
      autoPlayOnListUpdate: false,
    })
    h.rerender(
      opts({
        replaceListOnUpdate: true,
        autoPlayOnListUpdate: false,
        audioLists: [{ musicSrc: 'https://z/1.mp3' }],
      }),
    )
    await flushMicrotasks()
    expect(h.result().state.status).toBe('paused')
  })
})

describe('useMusicPlayer — track mutation', () => {
  it('removeTrack of a non-current track keeps playback', async () => {
    const h = await setup()
    const last = h.result().state.tracks[2].id
    act(() => h.result().actions.removeTrack(last))
    expect(h.result().state.tracks).toHaveLength(2)
    expect(h.result().state.index).toBe(0)
    expect(h.result().state.status).toBe('playing')
  })

  it('removeTrack of the current track plays the next one', async () => {
    const h = await setup()
    act(() => h.result().actions.playIndex(1))
    await flushMicrotasks()
    const currentId = h.result().state.tracks[1].id
    act(() => h.result().actions.removeTrack(currentId))
    await flushMicrotasks()
    expect(h.result().state.tracks).toHaveLength(2)
    expect(h.result().state.index).toBe(1)
    expect(h.result().state.src).toBe('https://x/2.mp3')
  })

  it('removeTrack of the last track resets to idle', async () => {
    const h = await setup({ audioLists: tracks(1) })
    const id = h.result().state.tracks[0].id
    act(() => h.result().actions.removeTrack(id))
    const s = h.result().state
    expect(s.status).toBe('idle')
    expect(s.index).toBe(-1)
    expect(s.tracks).toHaveLength(0)
  })

  it('clearTracks empties and goes idle', async () => {
    const onTracksChange = vi.fn()
    const h = await setup({ onTracksChange })
    act(() => h.result().actions.clearTracks())
    const s = h.result().state
    expect(s.tracks).toHaveLength(0)
    expect(s.status).toBe('idle')
    expect(onTracksChange).toHaveBeenCalledWith([], expect.anything())
  })

  it('reorderTracks keeps the current track selected', async () => {
    const h = await setup()
    act(() => h.result().actions.playIndex(0))
    await flushMicrotasks()
    const currentId = h.result().state.tracks[0].id
    act(() => h.result().actions.reorderTracks(0, 2))
    const s = h.result().state
    expect(s.tracks[2].id).toBe(currentId)
    expect(s.index).toBe(2)
    expect(s.src).toBe('https://x/0.mp3')
  })
})

describe('useMusicPlayer — persistence', () => {
  it('restores persisted state on mount and currentTime on canplay', async () => {
    localStorage.setItem(
      'trmp:test',
      JSON.stringify({
        version: 1,
        trackId: null,
        musicSrc: 'https://x/1.mp3',
        currentTime: 42,
        volume: 0.5,
        muted: false,
        playMode: 'singleLoop',
        theme: 'light',
        playing: false,
      }),
    )
    const h = await setup({ persist: 'trmp:test' })
    const s = h.result().state
    expect(s.playMode).toBe('singleLoop')
    expect(s.theme).toBe('light')
    expect(s.volume).toBe(0.5)
    expect(s.index).toBe(1)
    expect(h.audio().currentTime).toBe(42)
  })

  it('throttles writes and clears on clearTracks', async () => {
    vi.useFakeTimers()
    const h = await setup({ persist: 'trmp:test2' })
    act(() => {
      media.advance(h.audio(), 5)
      media.advance(h.audio(), 5)
      vi.advanceTimersByTime(0)
    })
    const writes1 = localStorage.getItem('trmp:test2')
    expect(writes1).not.toBeNull()
    act(() => {
      media.advance(h.audio(), 5)
      vi.advanceTimersByTime(TIMING.PERSIST_THROTTLE_MS + 10)
    })
    const saved = JSON.parse(localStorage.getItem('trmp:test2') ?? '{}') as {
      currentTime: number
      playMode: string
    }
    expect(saved.currentTime).toBe(15)
    act(() => h.result().actions.clearTracks())
    expect(localStorage.getItem('trmp:test2')).toBeNull()
  })
})

describe('useMusicPlayer — lyrics', () => {
  const lyric = '[00:01.00]one\n[00:02.00]two\n[00:03.00]three'

  it('emits lyric lines as time progresses', async () => {
    vi.useFakeTimers()
    const onLyricChange = vi.fn()
    const h = await setup({
      onLyricChange,
      audioLists: [{ musicSrc: 'https://x/l.mp3', lyric }],
    })
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(onLyricChange).toHaveBeenLastCalledWith('one', 0)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onLyricChange).toHaveBeenLastCalledWith('two', 1)
    expect(h.result().state.currentLyric).toBe('two')
    expect(h.result().state.lyricIndex).toBe(1)
  })

  it('re-anchors on seek', async () => {
    vi.useFakeTimers()
    const onLyricChange = vi.fn()
    const h = await setup({
      onLyricChange,
      audioLists: [{ musicSrc: 'https://x/l.mp3', lyric }],
    })
    act(() => h.result().actions.seek(2.5))
    expect(h.result().state.currentLyric).toBe('two')
  })
})

describe('useMusicPlayer — download & info', () => {
  it('downloads with sync onBeforeDownload + customDownloader', async () => {
    const onBeforeDownload = vi.fn(() => ({
      src: 'https://x/0.mp3',
      filename: 'custom.mp3',
    }))
    const customDownloader = vi.fn()
    const onDownload = vi.fn()
    const h = await setup({
      onBeforeDownload,
      customDownloader,
      onDownload,
    })
    await act(() => h.result().actions.download())
    expect(customDownloader).toHaveBeenCalledWith({
      src: 'https://x/0.mp3',
      filename: 'custom.mp3',
    })
    expect(onDownload).toHaveBeenCalledWith(expect.anything(), {
      src: 'https://x/0.mp3',
      filename: 'custom.mp3',
    })
  })

  it('supports async onBeforeDownload and defaults', async () => {
    const customDownloader = vi.fn()
    const h = await setup({
      onBeforeDownload: () =>
        Promise.resolve({ src: 'https://x/0.mp3', filename: 'async.mp3' }),
      customDownloader,
    })
    await act(() => h.result().actions.download())
    expect(customDownloader).toHaveBeenCalledWith({
      src: 'https://x/0.mp3',
      filename: 'async.mp3',
    })
    // no onBeforeDownload -> inferred filename
    const h2 = await setup({ customDownloader })
    await act(() => h2.result().actions.download())
    expect(customDownloader).toHaveBeenLastCalledWith(
      expect.objectContaining({ src: 'https://x/0.mp3' }),
    )
  })

  it('getAudioInfo reads the live element', async () => {
    const h = await setup()
    act(() => media.advance(h.audio(), 7))
    const info = h.result().actions.getAudioInfo()
    expect(info).toMatchObject({
      index: 0,
      currentTime: 7,
      playMode: 'order',
      paused: false,
    })
    expect(info.tracks).toHaveLength(3)
    expect(info.track?.id).toBe(h.result().state.tracks[0].id)
  })
})

describe('useMusicPlayer — buffered & abort', () => {
  it('tracks buffered fraction on progress', async () => {
    const h = await setup()
    act(() => media.setBuffered(h.audio(), 0.5))
    expect(h.result().state.buffered).toBe(0.5)
  })

  it('fires onAbort', async () => {
    const onAbort = vi.fn()
    const h = await setup({ onAbort })
    act(() => media.emit(h.audio(), 'abort'))
    expect(onAbort).toHaveBeenCalled()
  })
})

describe('useMusicPlayer — edge coverage', () => {
  it('prefers a finite track.duration over the element duration', async () => {
    const h = await setup({
      audioLists: [{ musicSrc: 'https://x/d.mp3', duration: 456 }],
    })
    expect(h.result().state.duration).toBe(456)
  })

  it('wraps non-Error async rejections', async () => {
    const onError = vi.fn()
    await setup({
      skipOnError: false,
      onError,
      audioLists: [{ musicSrc: () => Promise.reject('oops') }],
    })
    const err = onError.mock.calls[0][0] as Error
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('oops')
  })

  it('caches resolved function sources per track id', async () => {
    const src = vi.fn().mockResolvedValue('https://x/c.mp3')
    const h = await setup({
      audioLists: [{ musicSrc: src }, { musicSrc: 'https://x/o.mp3' }],
    })
    act(() => h.result().actions.next())
    await flushMicrotasks()
    act(() => h.result().actions.prev())
    await flushMicrotasks()
    expect(src).toHaveBeenCalledTimes(1)
  })

  it('uses PERSIST_KEY when persist: true', async () => {
    vi.useFakeTimers()
    const h = await setup({ persist: true })
    act(() => {
      media.advance(h.audio(), 5)
      vi.advanceTimersByTime(TIMING.PERSIST_THROTTLE_MS + 10)
    })
    expect(localStorage.getItem('trmp:player')).not.toBeNull()
  })

  it('restores the track by persisted trackId', async () => {
    localStorage.setItem(
      'trmp:tid',
      JSON.stringify({
        version: 1,
        trackId: 'stable-id',
        musicSrc: null,
        currentTime: 0,
        volume: 1,
        muted: true,
        playMode: 'order',
        theme: 'dark',
        playing: false,
      }),
    )
    const h = await setup({
      persist: 'trmp:tid',
      audioLists: [
        { musicSrc: 'https://x/a.mp3' },
        { musicSrc: 'https://x/b.mp3', id: 'stable-id' } as AudioTrack,
      ],
    })
    expect(h.result().state.index).toBe(1)
    expect(h.result().state.muted).toBe(true)
  })

  it('mobileMediaQuery: null disables mobile detection', async () => {
    const h = await setup({ mobileMediaQuery: null })
    expect(h.result().state.isMobile).toBe(false)
  })

  it('replacing the list with an empty one goes idle', async () => {
    const h = await setup({ replaceListOnUpdate: true })
    h.rerender(opts({ replaceListOnUpdate: true, audioLists: [] }))
    expect(h.result().state.index).toBe(-1)
    expect(h.result().state.status).toBe('idle')
  })

  it('removeTrack ignores unknown ids', async () => {
    const onTracksChange = vi.fn()
    const h = await setup({ onTracksChange })
    act(() => h.result().actions.removeTrack('nope'))
    expect(h.result().state.tracks).toHaveLength(3)
  })

  it('removeTrack before the index shifts the current index down', async () => {
    const h = await setup()
    act(() => h.result().actions.playIndex(1))
    await flushMicrotasks()
    const first = h.result().state.tracks[0].id
    act(() => h.result().actions.removeTrack(first))
    await flushMicrotasks()
    expect(h.result().state.index).toBe(0)
    expect(h.result().state.src).toBe('https://x/1.mp3')
  })

  it('reorderTracks with equal indices is a no-op', async () => {
    const onTracksChange = vi.fn()
    const h = await setup({ onTracksChange })
    const before = h.result().state.tracks
    act(() => h.result().actions.reorderTracks(1, 1))
    expect(h.result().state.tracks).toBe(before)
    expect(onTracksChange).not.toHaveBeenCalled()
  })

  it('setVolume retargets an in-flight fade-in', async () => {
    vi.useFakeTimers()
    const h = await setup({ volumeFade: { fadeIn: 1000 } })
    expect(h.result().state.fading).toBe('in')
    act(() => h.result().actions.setVolume(0.2))
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(h.audio().volume).toBeCloseTo(0.04) // 0.2^2
  })

  it('seek allows any position when duration is unknown', async () => {
    media.restore()
    media = installFakeMedia({ duration: 0 })
    const h = await setup()
    act(() => h.result().actions.seek(50))
    expect(h.audio().currentTime).toBe(50)
  })

  it('toggleTheme flips back to dark and toggleMode back to full', async () => {
    const h = await setup()
    act(() => h.result().actions.toggleTheme())
    expect(h.result().state.theme).toBe('light')
    act(() => h.result().actions.toggleTheme())
    expect(h.result().state.theme).toBe('dark')
    act(() => h.result().actions.toggleMode())
    act(() => h.result().actions.toggleMode())
    expect(h.result().state.mode).toBe('full')
  })

  it('download() is a no-op with no current source', async () => {
    const customDownloader = vi.fn()
    const h = await setup({ audioLists: [], customDownloader })
    await act(() => h.result().actions.download())
    expect(customDownloader).not.toHaveBeenCalled()
  })

  it('download() falls back to the current src', async () => {
    const customDownloader = vi.fn()
    const h = await setup({
      onBeforeDownload: () => ({ src: '', filename: 'x.mp3' }),
      customDownloader,
    })
    await act(() => h.result().actions.download())
    expect(customDownloader).toHaveBeenCalledWith(
      expect.objectContaining({ src: 'https://x/0.mp3' }),
    )
  })

  it('handles an error event with no element error', async () => {
    const onError = vi.fn()
    const h = await setup({ skipOnError: false, onError })
    act(() => media.emit(h.audio(), 'error'))
    expect(h.result().state.status).toBe('error')
    expect(onError).toHaveBeenCalledWith(null, expect.anything())
  })
})

describe('useMusicPlayer — unmount', () => {
  it('actions are safe after unmount (no audio element)', async () => {
    const h = await setup()
    const { actions } = h.result()
    h.unmount()
    const info = actions.getAudioInfo()
    expect(info.readyState).toBe(0)
    expect(info.paused).toBe(true)
    actions.seek(10)
    actions.seekBy(5)
    actions.toggleMute()
    actions.pause()
    actions.togglePlay()
    await act(() => actions.play())
  })
  it('cancels fades, stops lyric scheduler and leaves no timers', async () => {
    vi.useFakeTimers()
    const h = await setup({
      persist: 'trmp:unmount',
      volumeFade: { fadeIn: 5000 },
      audioLists: [{ musicSrc: 'https://x/a.mp3', lyric: '[00:01.00]one' }],
    })
    act(() => {
      media.advance(h.audio(), 1)
    })
    h.unmount()
    // jsdom schedules storage events via setTimeout — flush environment noise
    vi.advanceTimersByTime(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('useMusicPlayer — crossOrigin', () => {
  it('omits the attribute by default', async () => {
    const h = await setup()
    expect(h.audio().hasAttribute('crossorigin')).toBe(false)
    expect(h.result().audioProps.crossOrigin).toBeUndefined()
  })

  it('forwards crossOrigin to the audio element', async () => {
    const h = await setup({ crossOrigin: 'use-credentials' })
    expect(h.audio().getAttribute('crossorigin')).toBe('use-credentials')
  })
})
