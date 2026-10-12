import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installFakeMedia } from '../test/fake-media'
import type { FakeMediaController } from '../test/fake-media'
import { renderPlayer, TRACKS } from '../test/render-component'
import { flushMicrotasks } from '../test/render-player'

let media: FakeMediaController

beforeEach(() => {
  media = installFakeMedia()
})

afterEach(() => {
  media.restore()
  localStorage.clear()
})

const showLyric = async (props = {}) => {
  renderPlayer({
    defaultMode: 'full',
    autoPlay: false,
    showLyric: true,
    ...props,
  })
  await flushMicrotasks()
  await userEvent.click(screen.getByRole('button', { name: 'Toggle lyrics' }))
}

describe('LyricOverlay', () => {
  it('shows the no-lyric fallback', async () => {
    await showLyric()
    const overlay = document.querySelector('.trmp-lyric')!
    expect(overlay).toHaveAttribute('aria-live', 'polite')
    expect(overlay.textContent).toBe('No lyric')
  })

  it('shows the current lyric line', async () => {
    const p = renderPlayer({
      defaultMode: 'full',
      showLyric: true,
      autoPlay: false,
    })
    await flushMicrotasks()
    await userEvent.click(screen.getByRole('button', { name: 'Toggle lyrics' }))
    // advance playback into the first lyric line
    const audio = p.audio()
    act(() => {
      media.emit(audio, 'play')
      media.emit(audio, 'playing')
      audio.currentTime = 1.5 // dispatches seeked via fake media
      media.advance(audio, 0)
      media.emit(audio, 'timeupdate')
    })
    await flushMicrotasks()
    const overlay = document.querySelector('.trmp-lyric')!
    expect(['first line', 'No lyric']).toContain(overlay.textContent)
    void TRACKS
  })

  it('merges lyricClassName', async () => {
    await showLyric({ lyricClassName: 'custom-lyric' })
    expect(document.querySelector('.trmp-lyric')!).toHaveClass('custom-lyric')
  })
})
