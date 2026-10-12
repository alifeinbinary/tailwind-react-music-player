const pad = (v: number) => (v < 10 ? `0${v}` : `${v}`)

/**
 * Formats a duration in seconds as `mm:ss`, or `hh:mm:ss` when >= 1 hour.
 * Non-finite and negative inputs yield `'00:00'`; fractions are truncated.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const total = Math.trunc(seconds)
  const s = total % 60
  const m = Math.trunc(total / 60) % 60
  const h = Math.trunc(total / 3600)
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** Clamps `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Returns a random integer in the inclusive `[min, max]` range.
 * The `random` source is injectable for deterministic tests.
 */
export function randomInt(
  min: number,
  max: number,
  random: () => number = Math.random,
): number {
  return Math.floor(random() * (max - min + 1)) + min
}

/**
 * Wraps a URL in `url("…")`, escaping `"` and `\` and stripping newlines so
 * the value can never break out of an inline `background-image` declaration.
 */
export function escapeCssUrl(url: string): string {
  const sanitized = url
    .replace(/[\r\n]+/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
  return `url("${sanitized}")`
}

/** Returns a random UUID, falling back to a hex id when `crypto.randomUUID` is unavailable. */
export function createId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.trunc(Math.random() * 16)
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
