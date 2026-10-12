import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installFakeMedia } from '../test/fake-media'
import type { FakeMediaController } from '../test/fake-media'
import { installMatchMedia } from '../test/setup'
import { renderPlayer } from '../test/render-component'
import { flushMicrotasks } from '../test/render-player'

let media: FakeMediaController

beforeEach(() => {
  media = installFakeMedia()
  installMatchMedia(true)
})

afterEach(() => {
  media.restore()
  installMatchMedia(false)
  localStorage.clear()
})

describe('MobilePanel', () => {
  it('renders a labelled modal dialog and moves focus into it', async () => {
    renderPlayer({ defaultMode: 'full' })
    await flushMicrotasks()
    const dialog = screen.getByRole('dialog', {
      name: 'Now playing Song One',
    })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(document.activeElement).toBe(dialog)
  })

  it('Escape minimizes back to the mini controller', async () => {
    const p = renderPlayer({ defaultMode: 'full' })
    await flushMicrotasks()
    const dialog = screen.getByRole('dialog', {
      name: 'Now playing Song One',
    })
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-mode', 'mini')
  })

  it('returns focus to the mini button on close', async () => {
    const p = renderPlayer()
    await flushMicrotasks()
    const mini = screen.getByRole('button', { name: 'Open player' })
    mini.focus()
    await userEvent.click(mini)
    await flushMicrotasks()
    // now in full mode with focus inside the dialog
    const dialogEl = screen.getByRole('dialog', {
      name: 'Now playing Song One',
    })
    expect(
      document.activeElement === dialogEl ||
        dialogEl.contains(document.activeElement),
    ).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Minimize' }))
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-mode', 'mini')
    expect(document.activeElement).toHaveAccessibleName('Open player')
  })

  it('omits the desktop-only volume control', async () => {
    renderPlayer({ defaultMode: 'full' })
    await flushMicrotasks()
    expect(screen.queryByRole('slider', { name: 'Volume' })).toBeNull()
  })
})
