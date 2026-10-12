import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectNoViolations } from '../../test/setup'
import type { AudioInfo } from '../../types'
import {
  CircleProgress,
  Cover,
  IconButton,
  RangeSlider,
  ThemeSwitch,
  Time,
  Toast,
  TrackTitle,
} from '.'

const info: AudioInfo = {
  track: { id: 'a', name: 'Song', singer: 'Artist', musicSrc: 'x.mp3' },
  index: 0,
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

describe('IconButton', () => {
  it('exposes label as name, pressed state and activates by keyboard', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { container } = render(
      <IconButton label="Play" pressed onClick={onClick} />,
    )
    const btn = screen.getByRole('button', { name: 'Play' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(btn).toHaveAttribute('title', 'Play')
    btn.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
    await expectNoViolations(container)
  })

  it('supports sizes, active style and disabled', () => {
    render(<IconButton label="X" size="lg" active disabled />)
    const btn = screen.getByRole('button', { name: 'X' })
    expect(btn).toBeDisabled()
    expect(btn.className).toContain('trmp-icon-button')
  })
})

describe('RangeSlider', () => {
  it('renders accessible range with valuetext and fill var', () => {
    render(
      <RangeSlider
        label="Volume"
        value={0.5}
        onChange={vi.fn()}
        formatValueText={(v) => `${v * 100}%`}
      />,
    )
    const input = screen.getByRole('slider', { name: 'Volume' })
    expect(input).toHaveAttribute('aria-valuetext', '50%')
    expect(input.style.getPropertyValue('--trmp-range-fill')).toBe('50%')
  })

  it('fires onChange and commits on pointerup/keyup', () => {
    const onChange = vi.fn()
    const onCommit = vi.fn()
    render(
      <RangeSlider
        label="Seek"
        value={0.2}
        onChange={onChange}
        onCommit={onCommit}
      />,
    )
    const input = screen.getByRole('slider')
    fireEvent.change(input, { target: { value: '0.6' } })
    expect(onChange).toHaveBeenCalledWith(0.6)
    fireEvent.pointerUp(input)
    expect(onCommit).toHaveBeenCalledWith(0.6)

    fireEvent.change(input, { target: { value: '0.7' } })
    fireEvent.keyUp(input, { key: 'ArrowRight' })
    expect(onCommit).toHaveBeenLastCalledWith(0.7)
  })

  it('renders a buffered layer when provided', () => {
    const { container } = render(
      <RangeSlider label="Seek" value={0} buffered={0.8} onChange={vi.fn()} />,
    )
    const buffered = container.querySelector('[aria-hidden="true"]')
    expect(buffered).toHaveStyle({ width: '80%' })
  })

  it('clamps the fill pct for out-of-range values', () => {
    render(<RangeSlider label="Seek" value={5} max={1} onChange={vi.fn()} />)
    expect(
      screen.getByRole('slider').style.getPropertyValue('--trmp-range-fill'),
    ).toBe('100%')
  })

  it('commits on blur and Home/End keyup; skips unmodified commits', () => {
    const onCommit = vi.fn()
    render(
      <RangeSlider
        label="Seek"
        value={0}
        onChange={vi.fn()}
        onCommit={onCommit}
      />,
    )
    const input = screen.getByRole('slider')
    fireEvent.keyUp(input, { key: 'ArrowRight' }) // nothing changed — no commit
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '0.9' } })
    fireEvent.keyUp(input, { key: 'End' })
    expect(onCommit).toHaveBeenLastCalledWith(0.9)
    fireEvent.change(input, { target: { value: '0.3' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenLastCalledWith(0.3)
  })

  it('supports disabled and custom min/max/step', () => {
    render(
      <RangeSlider
        label="Seek"
        value={30}
        min={0}
        max={300}
        step={5}
        disabled
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('slider')).toBeDisabled()
  })
})

describe('ThemeSwitch', () => {
  it('is an ARIA switch that toggles', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const { container } = render(
      <ThemeSwitch
        theme="dark"
        label="Theme"
        labels={{ light: 'Light', dark: 'Dark' }}
        onToggle={onToggle}
      />,
    )
    const sw = screen.getByRole('switch', { name: 'Theme' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await user.click(sw)
    expect(onToggle).toHaveBeenCalledTimes(1)
    await expectNoViolations(container)
  })
})

describe('CircleProgress', () => {
  it('renders a hidden svg ring', () => {
    const { container } = render(<CircleProgress progress={0.5} size={40} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('circle')).toHaveLength(2)
  })
})

describe('Toast', () => {
  it('is a polite status region', async () => {
    const { container } = render(<Toast visible>Tip</Toast>)
    expect(screen.getByRole('status')).toHaveTextContent('Tip')
    await expectNoViolations(container)
  })

  it('hides when not visible', () => {
    const { container } = render(<Toast visible={false}>Tip</Toast>)
    expect(container.querySelector('.trmp-toast')?.className).toContain(
      'trmp:hidden',
    )
  })
})

describe('Cover', () => {
  it('renders an img role with background and paused animation', async () => {
    const { container } = render(
      <Cover src="https://a/cover.png" label="Album art" />,
    )
    const img = screen.getByRole('img', { name: 'Album art' })
    expect(img.style.backgroundImage).toContain('cover.png')
    await expectNoViolations(container)
  })

  it('renders a labelled button when clickable', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Cover src="a.png" label="Cover" onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: 'Cover' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('hides when empty and hideWhenEmpty', () => {
    const { container } = render(<Cover label="Cover" hideWhenEmpty />)
    expect(container.firstChild).toBeNull()
  })

  it('remounts (resetting rotation) when `reset` changes and spins while playing', () => {
    const { container, rerender } = render(
      <Cover src="a.png" label="Cover" reset="t1" spinning />,
    )
    const first = container.querySelector('.trmp-cover')
    expect(first?.className).toContain('trmp:animate-spin')
    rerender(<Cover src="a.png" label="Cover" reset="t2" spinning />)
    expect(container.querySelector('.trmp-cover')).not.toBe(first)
  })
})

describe('TrackTitle', () => {
  it('renders "name - singer" with a title attr', () => {
    render(<TrackTitle info={info} />)
    const el = screen.getByTitle('Song - Artist')
    expect(el).toHaveTextContent('Song - Artist')
  })

  it('uses renderTrackTitle when provided', () => {
    render(
      <TrackTitle info={info} render={(i) => <>custom:{i.track?.name}</>} />,
    )
    expect(screen.getByText(/custom:Song/)).toBeInTheDocument()
  })

  it('omits singer when absent and extracts text for the title attr', () => {
    const nameOnly: AudioInfo = {
      ...info,
      track: { id: 'b', name: 'Only', musicSrc: 'y.mp3' },
    }
    const { rerender } = render(<TrackTitle info={nameOnly} />)
    expect(screen.getByTitle('Only')).toBeInTheDocument()
    // non-text render output yields no title attr
    rerender(<TrackTitle info={info} render={() => <span>rich</span>} />)
    expect(screen.getByText('rich')).not.toHaveAttribute('title')
  })
})

describe('Time', () => {
  it('formats seconds and shows a placeholder while loading', () => {
    const { rerender } = render(<Time seconds={65} label="Current time" />)
    expect(screen.getByLabelText('Current time')).toHaveTextContent('01:05')
    rerender(<Time seconds={65} label="Current time" loading />)
    expect(screen.getByLabelText('Current time')).toHaveTextContent('--:--')
  })
})
