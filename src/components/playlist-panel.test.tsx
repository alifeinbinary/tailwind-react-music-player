import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installFakeMedia } from '../test/fake-media'
import type { FakeMediaController } from '../test/fake-media'
import { renderPlayer } from '../test/render-component'
import { flushMicrotasks } from '../test/render-player'
import { TIMING } from '../constants'

vi.mock('../hooks/use-sortable', () => ({
  useSortable: vi.fn(),
}))

const { useSortable } = await import('../hooks/use-sortable')
const useSortableMock = vi.mocked(useSortable)

let media: FakeMediaController

beforeEach(() => {
  media = installFakeMedia()
})

afterEach(() => {
  media.restore()
  localStorage.clear()
  vi.clearAllMocks()
})

const openPlaylist = async (
  props = {},
  overrides: { onPlaylistToggle?: (open: boolean) => void } = {},
) => {
  const onPlaylistToggle = overrides.onPlaylistToggle ?? vi.fn()
  const p = renderPlayer({
    defaultMode: 'full',
    autoPlay: false,
    onPlaylistToggle,
    ...props,
  })
  await flushMicrotasks()
  await userEvent.click(screen.getByRole('button', { name: 'Playlist' }))
  return { p, onPlaylistToggle }
}

describe('PlaylistPanel', () => {
  it('renders track names and singers with aria-current on the current', async () => {
    await openPlaylist()
    const items = screen.getAllByRole('button', {
      name: /Song (One Alice|Two Bob|Three Carol)/,
    })
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveAttribute('aria-current', 'true')
    expect(items[1]).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Alice')).not.toBeNull()
    expect(screen.getByText('Playlist (3)')).not.toBeNull()
  })

  it('click a track plays it', async () => {
    await openPlaylist()
    await userEvent.click(screen.getByRole('button', { name: /Song Two Bob/ }))
    await flushMicrotasks()
    expect(
      screen.getByRole('region', { name: 'Now playing Song Two' }),
    ).not.toBeNull()
  })

  it('remove runs the animation then calls removeTrack', async () => {
    vi.useFakeTimers()
    try {
      const p = renderPlayer({ defaultMode: 'full', autoPlay: false })
      await flushMicrotasks()
      const playlistBtn = screen.getByRole('button', { name: 'Playlist' })
      fireEvent.click(playlistBtn)
      fireEvent.click(screen.getByRole('button', { name: 'Remove Song One' }))
      // still present during the removal animation
      expect(
        screen.getByRole('button', { name: /Song One Alice/ }),
      ).not.toBeNull()
      act(() => vi.advanceTimersByTime(TIMING.REMOVE_ANIMATION_MS))
      await flushMicrotasks()
      expect(
        screen.queryByRole('button', { name: /Song One Alice/ }),
      ).toBeNull()
      void p
    } finally {
      vi.useRealTimers()
    }
  })

  it('clear playlist empties the list', async () => {
    await openPlaylist()
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear playlist' }),
    )
    expect(screen.getByText('No music available')).not.toBeNull()
  })

  it('empty state shows the empty message', async () => {
    const p = renderPlayer({
      audioLists: [],
      defaultMode: 'full',
      autoPlay: false,
    })
    await flushMicrotasks()
    await userEvent.click(screen.getByRole('button', { name: 'Playlist' }))
    expect(screen.getByText('No music available')).not.toBeNull()
    void p
  })

  it('removable={false} hides remove and clear buttons', async () => {
    await openPlaylist({ removable: false })
    expect(screen.queryByRole('button', { name: 'Clear playlist' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Remove Song/ })).toBeNull()
  })

  it('Escape closes and calls onPlaylistToggle(false)', async () => {
    const { onPlaylistToggle } = await openPlaylist()
    const dialog = screen.getByRole('dialog', { name: 'Playlist' })
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(dialog).toHaveAttribute('data-open', 'false')
    expect(onPlaylistToggle).toHaveBeenLastCalledWith(false)
  })

  it('Alt+ArrowDown reorders by one and keeps focus', async () => {
    const p = await openPlaylist()
    const item = screen.getByRole('button', { name: /Song One Alice/ })
    item.focus()
    fireEvent.keyDown(item, { key: 'ArrowDown', altKey: true })
    await flushMicrotasks()
    const items = screen.getAllByRole('button', {
      name: /Song (One Alice|Two Bob|Three Carol)/,
    })
    expect(items[1].textContent).toContain('Song One')
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement).toBe(items[1])
    void p
  })

  it('Alt+ArrowUp at the top is a no-op', async () => {
    await openPlaylist()
    const item = screen.getByRole('button', { name: /Song One Alice/ })
    fireEvent.keyDown(item, { key: 'ArrowUp', altKey: true })
    await flushMicrotasks()
    expect(
      screen.getAllByRole('button', {
        name: /Song One Alice|Song Two Bob|Song Three Carol/,
      })[0].textContent,
    ).toContain('Song One')
  })

  it('items expose the reorder hint via aria-describedby', async () => {
    await openPlaylist()
    const item = screen.getByRole('button', { name: /Song One Alice/ })
    const hintId = item.getAttribute('aria-describedby')!
    expect(document.getElementById(hintId)!.textContent).toBe(
      'Press Alt+Arrow keys to reorder',
    )
  })

  it('close button closes the panel', async () => {
    await openPlaylist()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog).toHaveAttribute('data-open', 'false')
    expect(dialog).toHaveAttribute('hidden')
  })

  it('disables sorting with a single track', async () => {
    const p = renderPlayer({
      audioLists: [{ name: 'Only', musicSrc: 'x.mp3' }],
      defaultMode: 'full',
      autoPlay: false,
      sortable: true,
    })
    await flushMicrotasks()
    await userEvent.click(screen.getByRole('button', { name: 'Playlist' }))
    expect(useSortableMock).toHaveBeenCalled()
    const lastCall =
      useSortableMock.mock.calls[useSortableMock.mock.calls.length - 1][1]
    expect(lastCall.enabled).toBe(false)
    void p
  })

  it('enables sorting with multiple tracks', async () => {
    await openPlaylist({ sortable: true })
    const lastCall =
      useSortableMock.mock.calls[useSortableMock.mock.calls.length - 1][1]
    expect(lastCall.enabled).toBe(true)
    expect(typeof lastCall.onSortEnd).toBe('function')
  })

  it('sortable={false} disables use-sortable', async () => {
    await openPlaylist({ sortable: false })
    const lastCall =
      useSortableMock.mock.calls[useSortableMock.mock.calls.length - 1][1]
    expect(lastCall.enabled).toBe(false)
  })
})
