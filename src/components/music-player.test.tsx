import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { installFakeMedia } from '../test/fake-media'
import type { FakeMediaController } from '../test/fake-media'
import { installMatchMedia, expectNoViolations } from '../test/setup'
import { renderPlayer, TRACKS } from '../test/render-component'
import { flushMicrotasks } from '../test/render-player'
import { MusicPlayer } from './music-player'
import type { MusicPlayerHandle } from '../types'

let media: FakeMediaController

beforeEach(() => {
  media = installFakeMedia()
})

afterEach(() => {
  media.restore()
  installMatchMedia(false)
  localStorage.clear()
})

describe('MusicPlayer — rendering', () => {
  it('renders the mini controller by default', async () => {
    const p = renderPlayer()
    await flushMicrotasks()
    expect(p.root()).toHaveClass('trmp-root')
    expect(p.root()).toHaveAttribute('data-mode', 'mini')
    expect(screen.getByRole('button', { name: 'Open player' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('container={null} renders inline', async () => {
    const { container } = render(
      <MusicPlayer audioLists={TRACKS} container={null} />,
    )
    await flushMicrotasks()
    expect(container.querySelector('.trmp-root')).not.toBeNull()
  })

  it('portals into document.body by default', async () => {
    const { container } = render(<MusicPlayer audioLists={TRACKS} />)
    await flushMicrotasks()
    expect(container.querySelector('.trmp-root')).toBeNull()
    expect(document.body.querySelector('.trmp-root')).not.toBeNull()
  })

  it('supports a function container', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    render(<MusicPlayer audioLists={TRACKS} container={() => host} />)
    await flushMicrotasks()
    expect(host.querySelector('.trmp-root')).not.toBeNull()
  })

  it('supports an HTMLElement container', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    render(<MusicPlayer audioLists={TRACKS} container={host} />)
    await flushMicrotasks()
    expect(host.querySelector('.trmp-root')).not.toBeNull()
  })

  it('passes className and style to the root', async () => {
    const p = renderPlayer({
      className: 'my-extra',
      style: { zIndex: 7 },
    })
    await flushMicrotasks()
    expect(p.root()).toHaveClass('my-extra')
    expect(p.root()).toHaveStyle({ zIndex: 7 })
  })
})

describe('MusicPlayer — mode', () => {
  it('mini click opens full mode; minimize returns', async () => {
    const p = renderPlayer()
    await flushMicrotasks()
    await userEvent.click(screen.getByRole('button', { name: 'Open player' }))
    expect(p.root()).toHaveAttribute('data-mode', 'full')
    await userEvent.click(screen.getByRole('button', { name: 'Minimize' }))
    expect(p.root()).toHaveAttribute('data-mode', 'mini')
  })

  it('allowModeToggle={false} hides the minimize control', async () => {
    renderPlayer({ defaultMode: 'full', allowModeToggle: false })
    await flushMicrotasks()
    expect(screen.queryByRole('button', { name: 'Minimize' })).toBeNull()
    expect(document.querySelector('.trmp-root')).toHaveAttribute(
      'data-mode',
      'full',
    )
  })
})

describe('MusicPlayer — ref handle', () => {
  it('exposes every action plus audio and destroy', async () => {
    const ref = createRef<MusicPlayerHandle | null>()
    render(<MusicPlayer audioLists={TRACKS} container={null} ref={ref} />)
    await flushMicrotasks()
    const h = ref.current!
    for (const key of [
      'play',
      'pause',
      'togglePlay',
      'prev',
      'next',
      'playId',
      'seek',
      'seekBy',
      'setVolume',
      'volumeBy',
      'toggleMute',
      'cyclePlayMode',
      'toggleTheme',
      'toggleMode',
      'reload',
      'download',
      'removeTrack',
      'clearTracks',
      'reorderTracks',
      'getAudioInfo',
    ]) {
      expect(typeof (h as unknown as Record<string, unknown>)[key]).toBe(
        'function',
      )
    }
    expect(h.audio).toBeInstanceOf(HTMLAudioElement)
  })

  it('actions work through the handle', async () => {
    const p = renderPlayer()
    await flushMicrotasks()
    act(() => p.handle.current!.toggleMode())
    expect(p.root()).toHaveAttribute('data-mode', 'full')
  })
})

describe('MusicPlayer — destroy', () => {
  it('onBeforeDestroy=false cancels', async () => {
    const onDestroyed = vi.fn()
    const p = renderPlayer({
      onBeforeDestroy: () => false,
      onDestroyed,
      showDestroy: true,
    })
    await flushMicrotasks()
    await userEvent.click(
      screen.getByRole('button', { name: 'Destroy player' }),
    )
    await flushMicrotasks()
    expect(p.root()).not.toBeNull()
    expect(onDestroyed).not.toHaveBeenCalled()
  })

  it('a rejected onBeforeDestroy cancels', async () => {
    const onDestroyed = vi.fn()
    renderPlayer({
      onBeforeDestroy: () => Promise.reject(new Error('nope')),
      onDestroyed,
      showDestroy: true,
    })
    await flushMicrotasks()
    await userEvent.click(
      screen.getByRole('button', { name: 'Destroy player' }),
    )
    await flushMicrotasks()
    expect(document.querySelector('.trmp-root')).not.toBeNull()
    expect(onDestroyed).not.toHaveBeenCalled()
  })

  it('destroys the player and fires onDestroyed', async () => {
    const onDestroyed = vi.fn()
    const p = renderPlayer({
      onBeforeDestroy: () => true,
      onDestroyed,
      showDestroy: true,
    })
    await flushMicrotasks()
    await userEvent.click(
      screen.getByRole('button', { name: 'Destroy player' }),
    )
    await flushMicrotasks()
    expect(document.querySelector('.trmp-root')).toBeNull()
    expect(onDestroyed).toHaveBeenCalledTimes(1)
    expect(onDestroyed).toHaveBeenCalledWith(
      expect.objectContaining({
        track: expect.objectContaining({ name: 'Song One' }),
      }),
    )
    void p
  })

  it('handle.destroy() removes the player', async () => {
    const ref = createRef<MusicPlayerHandle | null>()
    render(<MusicPlayer audioLists={TRACKS} container={null} ref={ref} />)
    await flushMicrotasks()
    await act(async () => {
      ref.current!.destroy()
    })
    expect(document.querySelector('.trmp-root')).toBeNull()
  })
})

describe('MusicPlayer — keyboard shortcuts', () => {
  it('does nothing when keyboardShortcuts is off', async () => {
    const p = renderPlayer({ keyboardShortcuts: false, autoPlay: false })
    await flushMicrotasks()
    const before = p.root().getAttribute('data-status')
    fireEvent.keyDown(p.root(), { key: ' ' })
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-status', before)
  })

  it('toggles play when enabled', async () => {
    const p = renderPlayer({ keyboardShortcuts: true, autoPlay: false })
    await flushMicrotasks()
    fireEvent.keyDown(p.root(), { key: ' ' })
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-status', 'playing')
  })
})

describe('MusicPlayer — theme', () => {
  it('reflects resolvedTheme and toggleTheme', async () => {
    const p = renderPlayer({ defaultTheme: 'dark' })
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-theme', 'dark')
    act(() => p.handle.current!.toggleTheme())
    expect(p.root()).toHaveAttribute('data-theme', 'light')
  })

  it('honours the controlled theme prop', async () => {
    const p = renderPlayer({ theme: 'light' })
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-theme', 'light')
  })
})

describe('MusicPlayer — responsive layout', () => {
  it('renders the mobile dialog when matchMedia matches', async () => {
    installMatchMedia(true)
    const p = renderPlayer({ defaultMode: 'full' })
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-layout', 'mobile')
    expect(screen.getByRole('dialog', { name: /now playing/i })).not.toBeNull()
  })

  it('renders desktop when matchMedia does not match', async () => {
    installMatchMedia(false)
    const p = renderPlayer({ defaultMode: 'full' })
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-layout', 'desktop')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('MusicPlayer — locale and icons', () => {
  it('accepts a locale id', async () => {
    renderPlayer({ locale: 'zh_CN' })
    await flushMicrotasks()
    expect(screen.getByRole('button', { name: '打开播放器' })).not.toBeNull()
  })

  it('accepts a partial locale object', async () => {
    renderPlayer({ locale: { open: 'GO' } })
    await flushMicrotasks()
    expect(screen.getByRole('button', { name: 'GO' })).not.toBeNull()
  })

  it('renders custom icons merged over defaults', async () => {
    renderPlayer({
      defaultMode: 'full',
      icons: { prev: <svg data-testid="custom-prev" /> },
    })
    await flushMicrotasks()
    expect(screen.getByTestId('custom-prev')).not.toBeNull()
  })
})

describe('MusicPlayer — axe', () => {
  it.each([
    ['mini', {}],
    ['full desktop', { defaultMode: 'full' as const }],
    ['mobile', { defaultMode: 'full' as const, mobile: true }],
    ['light theme', { defaultMode: 'full' as const, theme: 'light' as const }],
  ])('is clean in %s', async (_name, opts) => {
    const { mobile, ...props } = opts as { mobile?: boolean }
    if (mobile) installMatchMedia(true)
    render(<MusicPlayer audioLists={TRACKS} container={null} {...props} />)
    await flushMicrotasks()
    await expectNoViolations(
      document.querySelector('.trmp-root') as HTMLElement,
    )
  })

  it('is clean with the playlist open', async () => {
    render(
      <MusicPlayer audioLists={TRACKS} container={null} defaultMode="full" />,
    )
    await flushMicrotasks()
    await userEvent.click(
      screen.getByRole('button', { name: 'Playlist', expanded: false }),
    )
    await expectNoViolations(
      document.querySelector('.trmp-root') as HTMLElement,
    )
  })

  it('is clean with the lyric overlay visible', async () => {
    render(
      <MusicPlayer
        audioLists={TRACKS}
        container={null}
        defaultMode="full"
        showLyric
      />,
    )
    await flushMicrotasks()
    await userEvent.click(screen.getByRole('button', { name: 'Toggle lyrics' }))
    await expectNoViolations(
      document.querySelector('.trmp-root') as HTMLElement,
    )
  })
})
