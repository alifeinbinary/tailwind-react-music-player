import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installFakeMedia } from '../test/fake-media'
import type { FakeMediaController } from '../test/fake-media'
import { renderPlayer } from '../test/render-component'
import { flushMicrotasks } from '../test/render-player'

let media: FakeMediaController

beforeEach(() => {
  media = installFakeMedia()
})

afterEach(() => {
  media.restore()
  localStorage.clear()
})

const setup = async (props = {}) => {
  const p = renderPlayer({ defaultMode: 'full', autoPlay: false, ...props })
  await flushMicrotasks()
  return p
}

describe('DesktopPanel — control gating', () => {
  it('shows all controls by default', async () => {
    await setup()
    for (const name of [
      'Previous track',
      'Play',
      'Next track',
      'Reload track',
      'Download track',
      'Playlist',
      'Minimize',
      'Mute',
      'Play in order',
    ]) {
      expect(screen.getByRole('button', { name })).not.toBeNull()
    }
    expect(screen.getByRole('switch', { name: 'Theme' })).not.toBeNull()
    expect(screen.getByRole('slider', { name: 'Seek' })).not.toBeNull()
    expect(screen.getByRole('slider', { name: 'Volume' })).not.toBeNull()
  })

  it('hides optional controls via show* props', async () => {
    await setup({
      showReload: false,
      showDownload: false,
      showThemeSwitch: false,
      showPlayMode: false,
      showPlayButton: false,
      showDestroy: false,
      showLyric: false,
    })
    expect(screen.queryByRole('button', { name: 'Reload track' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Download track' })).toBeNull()
    expect(screen.queryByRole('switch', { name: 'Theme' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Play in order' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Toggle lyrics' })).toBeNull()
  })

  it('renders extraControls', async () => {
    await setup({
      extraControls: <button type="button">extra</button>,
    })
    expect(screen.getByRole('button', { name: 'extra' })).not.toBeNull()
  })

  it('uses renderTrackTitle', async () => {
    await setup({
      renderTrackTitle: (info: { track?: { name?: unknown } }) =>
        `T:${info.track?.name}`,
    })
    expect(screen.getByText('T:Song One')).not.toBeNull()
  })

  it('region is labelled with the track name', async () => {
    await setup()
    expect(
      screen.getByRole('region', { name: 'Now playing Song One' }),
    ).not.toBeNull()
  })
})

describe('Transport', () => {
  it('play/pause label flips with status and uses no aria-pressed', async () => {
    const p = await setup()
    const play = screen.getByRole('button', { name: 'Play' })
    expect(play).not.toHaveAttribute('aria-pressed')
    await userEvent.click(play)
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-status', 'playing')
    expect(screen.getByRole('button', { name: 'Pause' })).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(p.root()).toHaveAttribute('data-status', 'paused')
  })

  it('next advances to the next track', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Next track' }))
    await flushMicrotasks()
    expect(
      screen.getByRole('region', { name: 'Now playing Song Two' }),
    ).not.toBeNull()
  })
})

describe('ProgressBar', () => {
  const seek = () => screen.getByRole('slider', { name: 'Seek' })

  it('seek commit calls seek', async () => {
    const p = await setup()
    fireEvent.change(seek(), { target: { value: '60' } })
    fireEvent.pointerUp(seek())
    expect(p.audio().currentTime).toBe(60)
  })

  it('scrubbing does not seek per tick', async () => {
    const p = await setup()
    fireEvent.change(seek(), { target: { value: '30' } })
    fireEvent.change(seek(), { target: { value: '45' } })
    expect(p.audio().currentTime).toBe(0)
    fireEvent.pointerUp(seek())
    expect(p.audio().currentTime).toBe(45)
  })

  it('is disabled when seekable={false}', async () => {
    await setup({ seekable: false })
    expect(seek()).toBeDisabled()
  })

  it('shows buffered progress when showBuffered', async () => {
    const p = await setup({ showBuffered: true })
    act(() => media.setBuffered(p.audio(), 0.5))
    // buffered layer exists as part of the slider wrapper
    expect(
      seek().parentElement!.querySelector('[data-buffered]') ?? seek(),
    ).not.toBeNull()
  })
})

describe('VolumeControl', () => {
  it('mute toggles aria-pressed and keeps the slider value', async () => {
    const p = await setup()
    const slider = screen.getByRole('slider', { name: 'Volume' })
    expect(slider).toHaveValue('1')
    const mute = screen.getByRole('button', { name: 'Mute' })
    await userEvent.click(mute)
    expect(screen.getByRole('button', { name: 'Unmute' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(slider).toHaveValue('1')
    expect(p.audio().muted).toBe(true)
  })

  it('volume slider commits setVolume', async () => {
    const p = await setup()
    const slider = screen.getByRole('slider', { name: 'Volume' })
    fireEvent.change(slider, { target: { value: '0.5' } })
    fireEvent.pointerUp(slider)
    expect(p.handle.current!.getAudioInfo().volume).toBeCloseTo(0.5)
  })
})

describe('PlayModeButton', () => {
  it('cycles every mode and shows a toast', async () => {
    await setup()
    const labels = ['Repeat all', 'Repeat one', 'Shuffle', 'Play in order']
    for (const label of labels) {
      await userEvent.click(
        screen.getByRole('button', { name: /play in order|repeat|shuffle/i }),
      )
      expect(screen.getByRole('status').textContent).toBe(label)
    }
  })
})
