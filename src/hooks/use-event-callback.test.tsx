import { renderHook } from '@testing-library/react'
import { useEventCallback } from './use-event-callback'

describe('useEventCallback', () => {
  it('invokes the function', () => {
    const { result } = renderHook(() => useEventCallback((v: number) => v * 2))
    expect(result.current(21)).toBe(42)
  })

  it('always invokes the latest function', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useEventCallback(() => v),
      { initialProps: { v: 1 } },
    )
    rerender({ v: 42 })
    expect(result.current()).toBe(42)
  })
})
