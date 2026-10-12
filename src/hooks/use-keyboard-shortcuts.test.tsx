import { render } from '@testing-library/react'
import { createRef } from 'react'
import type { RefObject } from 'react'
import { useKeyboardShortcuts } from './use-keyboard-shortcuts'
import type { KeyboardShortcutHandlers } from './use-keyboard-shortcuts'

const setup = (enabled = true) => {
  const ref = createRef<HTMLDivElement | null>()
  const handlers: KeyboardShortcutHandlers = {
    togglePlay: vi.fn(),
    seekBy: vi.fn(),
    volumeBy: vi.fn(),
    toggleMute: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
  }
  function Host() {
    useKeyboardShortcuts(
      ref as RefObject<HTMLElement | null>,
      handlers,
      enabled,
    )
    return (
      <div ref={ref} data-testid="target">
        <input data-testid="input" aria-label="in" />
        <textarea data-testid="textarea" aria-label="ta" />
      </div>
    )
  }
  const utils = render(<Host />)
  return { ...utils, handlers, target: utils.getByTestId('target') }
}

const press = (el: HTMLElement, key: string) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  })
  el.dispatchEvent(event)
  return event
}

describe('useKeyboardShortcuts', () => {
  it.each([
    [' ', 'togglePlay', []],
    ['Space', 'togglePlay', []],
    ['ArrowLeft', 'seekBy', [-5]],
    ['ArrowRight', 'seekBy', [5]],
    ['ArrowUp', 'volumeBy', [0.1]],
    ['ArrowDown', 'volumeBy', [-0.1]],
    ['m', 'toggleMute', []],
    ['n', 'next', []],
    ['p', 'prev', []],
  ] as const)('key %s calls %s', (key, handler, args) => {
    const { handlers, target } = setup()
    press(target, key)
    expect(handlers[handler]).toHaveBeenCalledWith(...args)
  })

  it('preventDefaults on handled keys', () => {
    const { target } = setup()
    expect(press(target, ' ').defaultPrevented).toBe(true)
    expect(press(target, 'ArrowLeft').defaultPrevented).toBe(true)
  })

  it.each(['input', 'textarea'] as const)(
    'ignores events from %s targets',
    (testId) => {
      const { handlers, getByTestId } = setup()
      press(getByTestId(testId), ' ')
      expect(handlers.togglePlay).not.toHaveBeenCalled()
    },
  )

  it('ignores already-prevented events and unmapped keys', () => {
    const { handlers, target } = setup()
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    event.preventDefault()
    target.dispatchEvent(event)
    press(target, 'x')
    expect(handlers.togglePlay).not.toHaveBeenCalled()
  })

  it('does not bind when disabled', () => {
    const { handlers, target } = setup(false)
    press(target, ' ')
    expect(handlers.togglePlay).not.toHaveBeenCalled()
  })
})
