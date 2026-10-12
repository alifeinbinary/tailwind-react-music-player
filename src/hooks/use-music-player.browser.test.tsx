import { act, useEffect } from 'react'
import { renderBrowser as render } from '../test/render-browser'
import type { UseMusicPlayerOptions, UseMusicPlayerResult } from '../types'
import { useMusicPlayer } from './use-music-player'
import tone1 from '../test/fixtures/tone-1s.wav?url'
import tone2 from '../test/fixtures/tone-2s.wav?url'

interface Harness {
  result(): UseMusicPlayerResult
  audio(): HTMLAudioElement
}

const sinkRef: { current?: UseMusicPlayerResult } = {}

function HookHarness({ options }: { options: UseMusicPlayerOptions }) {
  const result = useMusicPlayer(options)
  useEffect(() => {
    sinkRef.current = result
  })
  // eslint-disable-next-line jsx-a11y/media-has-caption -- music playback; lyrics are covered by the dedicated lyric test
  return <audio {...result.audioProps} />
}

const setup = (options: UseMusicPlayerOptions): Harness => {
  render(<HookHarness options={options} />)
  return {
    result: () => {
      if (!sinkRef.current) throw new Error('hook has not rendered')
      return sinkRef.current
    },
    audio: () => {
      const el = sinkRef.current?.audioRef.current
      if (!el) throw new Error('audio element missing')
      return el
    },
  }
}

const twoTracks = (first = tone2, second = tone1) => [
  { name: 'Long', musicSrc: first },
  { name: 'Short', musicSrc: second },
]

describe('useMusicPlayer in a real browser', () => {
  it('autoPlay plays, advances, and on ended moves to the next track (orderLoop)', async () => {
    const h = setup({
      audioLists: twoTracks(),
      autoPlay: true,
      playMode: 'orderLoop',
    })
    await vi.waitFor(() => expect(h.result().state.status).toBe('playing'), {
      timeout: 5000,
    })
    await vi.waitFor(() => expect(h.audio().currentTime).toBeGreaterThan(0.2), {
      timeout: 5000,
    })
    // 2s track ends -> orderLoop selects the next track and keeps playing
    await vi.waitFor(() => expect(h.result().state.index).toBe(1), {
      timeout: 8000,
    })
    await vi.waitFor(() => expect(h.result().state.status).toBe('playing'), {
      timeout: 5000,
    })
  }, 30000)

  it('order mode stops at the end', async () => {
    const h = setup({
      audioLists: [{ name: 'Only', musicSrc: tone1 }],
      autoPlay: true,
      playMode: 'order',
    })
    await vi.waitFor(() => expect(h.result().state.status).toBe('playing'), {
      timeout: 5000,
    })
    await vi.waitFor(
      () => expect(h.result().state.status).not.toBe('playing'),
      { timeout: 8000 },
    )
    expect(h.result().state.index).toBe(0)
  }, 20000)

  it('seek() lands within tolerance and fires onSeeked', async () => {
    const onSeeked = vi.fn()
    const h = setup({
      audioLists: twoTracks(),
      autoPlay: false,
      onSeeked,
    })
    await vi.waitFor(() => expect(h.audio().readyState).toBeGreaterThan(0), {
      timeout: 5000,
    })
    await act(async () => {
      h.result().actions.seek(1.5)
    })
    await vi.waitFor(() => expect(onSeeked).toHaveBeenCalled(), {
      timeout: 3000,
    })
    expect(Math.abs(h.audio().currentTime - 1.5)).toBeLessThan(0.3)
  })

  it('setVolume applies the perceptual gain curve', async () => {
    const h = setup({ audioLists: twoTracks(), autoPlay: false })
    await vi.waitFor(() => expect(h.audio().readyState).toBeGreaterThan(0), {
      timeout: 5000,
    })
    await act(async () => {
      h.result().actions.setVolume(0.5)
    })
    expect(h.audio().volume).toBeCloseTo(0.25, 1)
  })

  it('volumeFade.fadeOut lowers gain during pause then restores', async () => {
    const h = setup({
      audioLists: twoTracks(),
      autoPlay: true,
      volumeFade: { fadeOut: 300 },
    })
    await vi.waitFor(() => expect(h.result().state.status).toBe('playing'), {
      timeout: 5000,
    })
    const gain = h.audio().volume
    const observed: number[] = []
    const poll = setInterval(() => observed.push(h.audio().volume), 25)
    await act(async () => {
      h.result().actions.pause()
    })
    await vi.waitFor(() => expect(h.audio().paused).toBe(true), {
      timeout: 3000,
    })
    clearInterval(poll)
    expect(observed.some((v) => v < gain - 0.01)).toBe(true)
    // gain restored so the next play starts at the right level
    expect(h.audio().volume).toBeCloseTo(gain, 1)
  }, 20000)

  it('a failing source fires onError and skipOnError advances', async () => {
    const onError = vi.fn()
    const h = setup({
      audioLists: [
        { name: 'Missing', musicSrc: '/definitely-not-there.wav' },
        { name: 'Good', musicSrc: tone1 },
      ],
      autoPlay: false,
      onError,
    })
    await vi.waitFor(() => expect(onError).toHaveBeenCalled(), {
      timeout: 8000,
    })
    await vi.waitFor(() => expect(h.result().state.index).toBe(1), {
      timeout: 8000,
    })
    await vi.waitFor(() => expect(h.audio().readyState).toBeGreaterThan(0), {
      timeout: 5000,
    })
  }, 20000)

  it('currentLyric follows playback position', async () => {
    const h = setup({
      audioLists: [
        {
          name: 'Lyric',
          musicSrc: tone2,
          lyric: '[00:00.00]zero\n[00:00.50]half\n[00:01.00]one\n',
        },
      ],
      autoPlay: true,
    })
    await vi.waitFor(() => expect(h.result().state.status).toBe('playing'), {
      timeout: 5000,
    })
    await vi.waitFor(() => expect(h.result().state.currentLyric).toBe('one'), {
      timeout: 8000,
    })
  }, 20000)
})
