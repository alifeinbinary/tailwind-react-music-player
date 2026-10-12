import { renderHook, act } from '@testing-library/react'
import { installFakeMedia } from '../test/fake-media'
import type { AudioInfo, UseMusicPlayerOptions } from '../types'
import type {
  InternalState,
  PlayerContext,
  PlayerLatest,
} from './player-context'
import { useAudioEvents } from './use-audio-events'
import { useAudioSource } from './use-audio-source'
import { useDownload } from './use-download'
import { useLyricSync } from './use-lyric-sync'
import { usePersistedState } from './use-persisted-state'
import { usePlaybackEvents } from './use-playback-events'
import { usePlayerActions } from './use-player-actions'
import { usePlaylistSync } from './use-playlist-sync'
import { useVolumeFade } from './use-volume-fade'

const baseInfo: AudioInfo = {
  track: null,
  index: -1,
  tracks: [],
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  paused: true,
  ended: false,
  readyState: 0,
  networkState: 0,
  playMode: 'order',
  currentLyric: null,
}

const makeState = (overrides: Partial<InternalState> = {}): InternalState => ({
  tracks: [],
  index: -1,
  src: null,
  status: 'idle',
  error: null,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  muted: false,
  fading: null,
  lyricIndex: -1,
  playbackRate: 1,
  selectGen: 0,
  ...overrides,
})

const makeCtx = (overrides: Partial<PlayerLatest> = {}) => {
  const latestValue: PlayerLatest = {
    options: { audioLists: [] } as UseMusicPlayerOptions,
    state: makeState(),
    index: -1,
    track: null,
    playMode: 'order',
    volume: 1,
    theme: 'dark',
    ...overrides,
  }
  const ctx: PlayerContext = {
    getLatest: () => latestValue,
    audioRef: { current: null },
    pendingPlayRef: { current: false },
    playingRef: { current: false },
    patch: vi.fn(),
    getAudioInfo: () => baseInfo,
  }
  return { ctx, latestValue }
}

describe('decomposed hooks (smoke)', () => {
  it('useAudioEvents binds and dispatches to the latest handlers', () => {
    const media = installFakeMedia()
    try {
      const handlers = { onPlay: vi.fn() }
      const { result } = renderHook(
        ({ h }) =>
          useAudioEvents(
            { current: null },
            {
              onLoadedMetadata: () => {},
              onCanPlay: () => {},
              onPlay: h.onPlay,
              onPause: () => {},
              onTimeUpdate: () => {},
              onProgress: () => {},
              onEnded: () => {},
              onError: () => {},
              onSeeked: () => {},
              onVolumeChange: () => {},
              onAbort: () => {},
              onRateChange: () => {},
            },
            () => true,
          ),
        { initialProps: { h: handlers } },
      )
      const el = document.createElement('audio')
      act(() => result.current(el))
      expect(el.muted).toBe(true)
      el.dispatchEvent(new Event('play'))
      expect(handlers.onPlay).toHaveBeenCalledTimes(1)
      act(() => result.current(null))
      el.dispatchEvent(new Event('play'))
      expect(handlers.onPlay).toHaveBeenCalledTimes(1)
    } finally {
      media.restore()
    }
  })

  it('useAudioSource notifies without mutating when playIndex is controlled', () => {
    const onPlayIndexChange = vi.fn()
    const { ctx, latestValue } = makeCtx({
      options: {
        audioLists: [{ musicSrc: 'a.mp3' }, { musicSrc: 'b.mp3' }],
        playIndex: 0,
        onPlayIndexChange,
      },
      state: makeState({
        tracks: [
          { id: 'a', musicSrc: 'a.mp3' },
          { id: 'b', musicSrc: 'b.mp3' },
        ],
        index: 0,
      }),
      index: 0,
      track: { id: 'a', musicSrc: 'a.mp3' },
    })
    const { result } = renderHook(() =>
      useAudioSource(ctx, {
        cancelFade: vi.fn(),
        seek: vi.fn(),
        selectKey: '0:a:0',
        src: null,
      }),
    )
    act(() => result.current.selectIndex(1))
    expect(onPlayIndexChange).toHaveBeenCalledWith(1)
    expect(latestValue.index).toBe(0)
    expect(ctx.patch).not.toHaveBeenCalledWith(
      expect.objectContaining({ index: 1 }),
    )
  })

  it('usePlaybackEvents exposes handlers for every media event', () => {
    const { ctx } = makeCtx()
    const fades = {
      playImpl: vi.fn(),
      pauseImpl: vi.fn(),
      togglePlay: vi.fn(),
      cancelFade: vi.fn(),
      applyVolumeGain: vi.fn(),
    }
    const source = {
      selectIndex: vi.fn(),
      playIndex: vi.fn(),
      playId: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      reload: vi.fn(),
      skipToNextOnError: vi.fn(),
    }
    const lyric = {
      lines: [],
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      stop: vi.fn(),
    }
    const persisted = {
      persistNow: vi.fn(),
      clear: vi.fn(),
      takeRestoreTime: () => null,
    }
    const { result } = renderHook(() =>
      usePlaybackEvents(ctx, { fades, source, lyric, persisted }),
    )
    expect(Object.keys(result.current)).toHaveLength(12)
    act(() => result.current.onProgress())
    expect(ctx.patch).not.toHaveBeenCalled() // no audio element bound
  })

  it('useVolumeFade resolves immediately when there is no track', async () => {
    const { ctx } = makeCtx()
    const { result } = renderHook(() => useVolumeFade(ctx, 1))
    await act(async () => {
      await result.current.playImpl()
    })
    expect(ctx.pendingPlayRef.current).toBe(false)
  })

  it('useLyricSync parses lines and stops on unmount', () => {
    const { ctx } = makeCtx()
    const track = { id: 't', musicSrc: 'a.mp3', lyric: '[00:01.00]hello' }
    const { result, unmount } = renderHook(() => useLyricSync(ctx, track))
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].text).toBe('hello')
    unmount()
  })

  it('usePersistedState no-ops when persist is false', () => {
    const { ctx } = makeCtx()
    const { result } = renderHook(() =>
      usePersistedState(ctx, {
        persist: false,
        restorePlayMode: false,
        restoreTheme: false,
        restoreVolume: false,
        setPlayMode: vi.fn(),
        setTheme: vi.fn(),
        setVolume: vi.fn(),
        selectIndex: vi.fn(),
        autoPlay: false,
      }),
    )
    act(() => result.current.persistNow())
    expect(result.current.takeRestoreTime()).toBeNull()
  })

  it('usePlaylistSync ignores removing an unknown track id', () => {
    const { ctx } = makeCtx({
      state: makeState({ tracks: [{ id: 'a', musicSrc: 'a.mp3' }], index: 0 }),
      index: 0,
      track: { id: 'a', musicSrc: 'a.mp3' },
    })
    const { result } = renderHook(() =>
      usePlaylistSync(ctx, {
        audioLists: [],
        replaceListOnUpdate: false,
        preserveCurrentOnUpdate: false,
        autoPlayOnListUpdate: false,
        selectIndex: vi.fn(),
        cancelFade: vi.fn(),
        persistClear: vi.fn(),
      }),
    )
    act(() => result.current.removeTrack('missing'))
    expect(ctx.patch).not.toHaveBeenCalled()
  })

  it('useDownload is a no-op without a current source', async () => {
    const { ctx } = makeCtx()
    const { result } = renderHook(() => useDownload(ctx))
    await act(async () => {
      await result.current()
    })
    expect(ctx.getAudioInfo).toBeDefined()
  })

  it('usePlayerActions clamps volume and delegates to the slider setter', () => {
    const { ctx } = makeCtx()
    const setVolumeState = vi.fn()
    const fades = {
      playImpl: vi.fn(),
      pauseImpl: vi.fn(),
      togglePlay: vi.fn(),
      cancelFade: vi.fn(),
      applyVolumeGain: vi.fn(),
    }
    const { result } = renderHook(() =>
      usePlayerActions(ctx, {
        fades,
        persistNow: vi.fn(),
        resolvedTheme: 'dark',
        mode: 'full',
        setVolumeState,
        setPlayModeState: vi.fn(),
        setThemeState: vi.fn(),
        setModeState: vi.fn(),
      }),
    )
    act(() => result.current.setVolume(2))
    expect(setVolumeState).toHaveBeenCalledWith(1)
    expect(fades.applyVolumeGain).toHaveBeenCalledWith(1)
  })
})
