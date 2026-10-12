import { fireEvent, screen } from '@testing-library/react'
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

const dragOn = (el: Element, dx: number, dy: number) => {
  fireEvent.mouseDown(el, { clientX: 0, clientY: 0 })
  fireEvent.mouseMove(document, { clientX: dx, clientY: dy })
  fireEvent.mouseUp(document)
}

describe('MiniController', () => {
  it('a plain click opens the full player', async () => {
    const p = renderPlayer()
    await flushMicrotasks()
    await userEvent.click(screen.getByRole('button', { name: 'Open player' }))
    expect(p.root()).toHaveAttribute('data-mode', 'full')
  })

  it('a drag beyond the threshold does not open', async () => {
    const p = renderPlayer()
    await flushMicrotasks()
    const mini = screen.getByRole('button', { name: 'Open player' })
    dragOn(mini, 50, 50)
    fireEvent.click(mini)
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-mode', 'mini')
  })

  it('a drag within the threshold still opens on click', async () => {
    const p = renderPlayer()
    await flushMicrotasks()
    const mini = screen.getByRole('button', { name: 'Open player' })
    dragOn(mini, 2, 1)
    fireEvent.click(mini)
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-mode', 'full')
  })

  it('destroy button only renders with showDestroy', async () => {
    renderPlayer({ showDestroy: false })
    await flushMicrotasks()
    expect(screen.queryByRole('button', { name: 'Destroy player' })).toBeNull()
  })

  it('renders the destroy button when showDestroy', async () => {
    renderPlayer({ showDestroy: true })
    await flushMicrotasks()
    expect(
      screen.getByRole('button', { name: 'Destroy player' }),
    ).not.toBeNull()
  })

  it('draggable={false} renders without drag behaviour', async () => {
    const p = renderPlayer({ draggable: false })
    await flushMicrotasks()
    const mini = screen.getByRole('button', { name: 'Open player' })
    dragOn(mini, 50, 50)
    fireEvent.click(mini)
    // no drag recorded — click still toggles
    await flushMicrotasks()
    expect(p.root()).toHaveAttribute('data-mode', 'full')
  })
})
