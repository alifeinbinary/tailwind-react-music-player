import '@testing-library/jest-dom/vitest'
import { axe } from 'vitest-axe'

/**
 * Asserts axe finds no accessibility violations. `toHaveNoViolations`
 * is not registered because vitest-axe@0.1's type augmentation targets
 * the legacy `Vi` namespace and no longer merges with vitest 5's
 * two-parameter `Assertion` interface.
 */
export const expectNoViolations = async (
  html: Element | string,
): Promise<void> => {
  // 'region' requires every scrap of page content inside a landmark —
  // meaningless when auditing a single component fragment.
  const results = await axe(html, {
    rules: { region: { enabled: false } },
  })
  expect(results.violations).toEqual([])
}

// jsdom lacks canvas 2d — axe's color-contrast rule calls getContext and
// would otherwise log "Not implemented" via jsdom's virtual console.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext

// jsdom lacks matchMedia. Default stub reports no match; tests that need
// a mobile layout install their own via `mockMatchMedia` below.
const listeners = new Set<(e: MediaQueryListEvent) => void>()
export const installMatchMedia = (matches = false): void => {
  listeners.clear()
  window.matchMedia = (query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_t: string, cb: (e: MediaQueryListEvent) => void) =>
        listeners.add(cb),
      removeEventListener: (_t: string, cb: (e: MediaQueryListEvent) => void) =>
        listeners.delete(cb),
      addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeListener: (cb: (e: MediaQueryListEvent) => void) =>
        listeners.delete(cb),
      dispatchEvent: () => true,
    }) as MediaQueryList
}
installMatchMedia()
