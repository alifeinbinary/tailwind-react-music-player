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
  const results = await axe(html)
  expect(results.violations).toEqual([])
}

// jsdom lacks canvas 2d — axe's color-contrast rule calls getContext and
// would otherwise log "Not implemented" via jsdom's virtual console.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext
