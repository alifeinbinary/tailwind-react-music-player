import { renderHook } from '@testing-library/react'
import { useResolvedTheme } from './use-system-theme'

const stubDark = (dark: boolean) =>
  vi.stubGlobal('matchMedia', () => ({
    matches: dark,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    media: '',
    dispatchEvent: vi.fn(),
  }))

afterEach(() => vi.unstubAllGlobals())

describe('useResolvedTheme', () => {
  it('returns explicit themes unchanged', () => {
    expect(renderHook(() => useResolvedTheme('dark')).result.current).toBe(
      'dark',
    )
    expect(renderHook(() => useResolvedTheme('light')).result.current).toBe(
      'light',
    )
  })

  it('resolves auto from prefers-color-scheme', () => {
    stubDark(true)
    expect(renderHook(() => useResolvedTheme('auto')).result.current).toBe(
      'dark',
    )
    stubDark(false)
    expect(renderHook(() => useResolvedTheme('auto')).result.current).toBe(
      'light',
    )
  })
})
