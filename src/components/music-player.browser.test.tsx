import { act } from 'react'
import { renderBrowser as render } from '../test/render-browser'
import { MusicPlayer } from './music-player'
import '../styles/index.css'
import tone2 from '../test/fixtures/tone-2s.wav?url'

const tracks = [
  { name: 'Browser Track', singer: 'Tester', musicSrc: tone2 },
]

const root = () => document.querySelector('.trmp-root') as HTMLElement
const audio = () => document.querySelector('audio') as HTMLAudioElement

describe('MusicPlayer in a real browser', () => {
  it(
    'plays for real and reports data-status',
    async () => {
      render(
        <MusicPlayer audioLists={tracks} defaultMode="full" preload="auto" />,
      )
      // wait until the source is ready — the play button is replaced by a
      // spinner while status === 'loading'
      let playBtn: HTMLElement | null = null
      await vi.waitFor(
        () => {
          playBtn = document.querySelector('button[aria-label="Play"]')
          expect(playBtn).toBeTruthy()
        },
        { timeout: 5000 },
      )
      await act(async () => playBtn!.click())
      await vi.waitFor(
        () => expect(root().dataset.status).toBe('playing'),
        { timeout: 5000 },
      )
      await vi.waitFor(
        () => expect(audio().currentTime).toBeGreaterThan(0.1),
        { timeout: 5000 },
      )
    },
    20000,
  )

  it(
    'seek slider commits a real seek',
    async () => {
      render(
        <MusicPlayer audioLists={tracks} defaultMode="full" autoPlay preload="auto" />,
      )
      await vi.waitFor(
        () => expect(root().dataset.status).toBe('playing'),
        { timeout: 5000 },
      )
      const slider = root().querySelector(
        'input[type="range"][aria-label="Seek"]',
      ) as HTMLInputElement
      expect(slider).toBeTruthy()
      const set = (value: string) => {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!
        setter.call(slider, value)
        slider.dispatchEvent(new Event('input', { bubbles: true }))
      }
      await act(async () => set('1.5'))
      // commit via change (pointerup equivalent for range inputs)
      await act(async () => {
        slider.dispatchEvent(new Event('change', { bubbles: true }))
      })
      await vi.waitFor(
        () => expect(Math.abs(audio().currentTime - 1.5)).toBeLessThan(0.4),
        { timeout: 5000 },
      )
    },
    20000,
  )

  it(
    'keyboard shortcuts: Space toggles, ArrowRight seeks +5 clamped',
    async () => {
      render(
        <MusicPlayer
          audioLists={tracks}
          defaultMode="full"
          autoPlay
          keyboardShortcuts
          preload="auto"
        />,
      )
      await vi.waitFor(
        () => expect(root().dataset.status).toBe('playing'),
        { timeout: 5000 },
      )
      await act(async () => {
        root().dispatchEvent(
          new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
        )
      })
      await vi.waitFor(() => expect(audio().paused).toBe(true), {
        timeout: 3000,
      })
      await act(async () => {
        root().dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
        )
      })
      await vi.waitFor(
        () => expect(audio().currentTime).toBeGreaterThan(1.4),
        { timeout: 3000 },
      )
      // clamped to duration (2s)
      expect(audio().currentTime).toBeLessThanOrEqual(
        audio().duration + 0.001,
      )
    },
    20000,
  )

  it('theme switch toggles data-theme', async () => {
    render(
      <MusicPlayer audioLists={tracks} defaultMode="full" preload="auto" />,
    )
    await vi.waitFor(() => expect(root()).toBeTruthy(), { timeout: 5000 })
    const initial = root().dataset.theme
    const toggle = root().querySelector(
      'button[aria-label*="theme" i], .trmp-theme button',
    ) as HTMLElement
    expect(toggle).toBeTruthy()
    await act(async () => toggle.click())
    await vi.waitFor(() =>
      expect(root().dataset.theme).not.toBe(initial),
    )
  })
})
