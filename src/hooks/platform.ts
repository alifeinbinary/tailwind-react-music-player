/**
 * Detects iOS (iPhone/iPad/iPod, incl. iPadOS-as-macOS via touch points).
 * iOS ignores programmatic `volume`, so fades must be skipped there.
 * SSR-safe: returns `false` without `navigator`.
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iP(hone|od|ad)/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}
