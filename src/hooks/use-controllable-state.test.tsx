import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { useControllableState } from './use-controllable-state'

describe('useControllableState', () => {
  it('is uncontrolled: defaultValue seeds, setter updates internally', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: 1, onChange }),
    )
    expect(result.current[0]).toBe(1)
    act(() => result.current[1](5))
    expect(result.current[0]).toBe(5)
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it('supports updater functions', () => {
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: 10 }),
    )
    act(() => result.current[1]((p) => p + 2))
    expect(result.current[0]).toBe(12)
  })

  it('is controlled: value prop drives, setter only fires onChange', () => {
    const onChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState({ value, defaultValue: 0, onChange }),
      { initialProps: { value: 3 } },
    )
    expect(result.current[0]).toBe(3)
    act(() => result.current[1](9))
    expect(onChange).toHaveBeenLastCalledWith(9)
    expect(result.current[0]).toBe(3) // unchanged: prop is source of truth
    rerender({ value: 7 })
    expect(result.current[0]).toBe(7)
  })

  it('keeps a stable setter identity', () => {
    const { result, rerender } = renderHook(() =>
      useControllableState({ defaultValue: 'a' }),
    )
    const first = result.current[1]
    rerender()
    act(() => result.current[1]('b'))
    rerender()
    expect(result.current[1]).toBe(first)
  })
})
