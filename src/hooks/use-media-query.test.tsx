import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { useMediaQuery } from './use-media-query'

interface StubMql {
  matches: boolean
  listeners: Set<(e: MediaQueryListEvent) => void>
  trigger(): void
}

const stubMatchMedia = (initial: boolean): StubMql => {
  const mql: StubMql = {
    matches: initial,
    listeners: new Set(),
    trigger() {
      for (const l of mql.listeners) {
        l({ matches: mql.matches } as MediaQueryListEvent)
      }
    },
  }
  vi.stubGlobal('matchMedia', () => ({
    matches: mql.matches,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
      mql.listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
      mql.listeners.delete(cb),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    media: '',
    dispatchEvent: vi.fn(),
  }))
  return mql
}

afterEach(() => vi.unstubAllGlobals())

describe('useMediaQuery', () => {
  it('returns the current match', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1px)'))
    expect(result.current).toBe(true)
  })

  it('updates on change events', () => {
    const mql = stubMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1px)'))
    expect(result.current).toBe(false)
    act(() => {
      mql.matches = true
      mql.trigger()
    })
    expect(result.current).toBe(true)
  })

  it('returns false and never calls matchMedia when query is null', () => {
    const spy = vi.fn()
    vi.stubGlobal('matchMedia', spy)
    const { result } = renderHook(() => useMediaQuery(null))
    expect(result.current).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })
})
