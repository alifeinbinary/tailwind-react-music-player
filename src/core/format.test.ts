import { afterEach, describe, expect, it, vi } from 'vitest'
import { clamp, createId, escapeCssUrl, formatTime, randomInt } from './format'

describe('formatTime', () => {
  it.each([
    [0, '00:00'],
    [9, '00:09'],
    [59.9, '00:59'],
    [60, '01:00'],
    [75, '01:15'],
    [599, '09:59'],
    [600, '10:00'],
    [3599, '59:59'],
    [3600, '01:00:00'],
    [3661, '01:01:01'],
    [36000, '10:00:00'],
  ])('formatTime(%s) === %s', (input, expected) => {
    expect(formatTime(input)).toBe(expected)
  })

  it.each([NaN, Infinity, -Infinity, -1, -3600])(
    'formatTime(%s) === "00:00"',
    (input) => {
      expect(formatTime(input)).toBe('00:00')
    },
  )

  it('truncates fractional seconds', () => {
    expect(formatTime(61.999)).toBe('01:01')
  })
})

describe('clamp', () => {
  it.each([
    [5, 0, 10, 5],
    [-1, 0, 10, 0],
    [11, 0, 10, 10],
    [0, 0, 10, 0],
    [10, 0, 10, 10],
  ])('clamp(%s, %s, %s) === %s', (v, min, max, expected) => {
    expect(clamp(v, min, max)).toBe(expected)
  })
})

describe('randomInt', () => {
  it('is inclusive on both ends', () => {
    expect(randomInt(1, 6, () => 0)).toBe(1)
    expect(randomInt(1, 6, () => 0.999999)).toBe(6)
  })

  it('returns min when min === max', () => {
    expect(randomInt(4, 4, () => 0.5)).toBe(4)
  })

  it('stays in range over many draws', () => {
    for (let i = 0; i < 200; i++) {
      const v = randomInt(0, 3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(3)
    }
  })
})

describe('escapeCssUrl', () => {
  it('wraps a plain url', () => {
    expect(escapeCssUrl('https://a/b.png')).toBe('url("https://a/b.png")')
  })

  it('cannot break out of the declaration', () => {
    const out = escapeCssUrl('x") ; background:url(evil')
    expect(out).toBe('url("x\\") ; background:url(evil")')
  })

  it('escapes backslashes and strips newlines', () => {
    expect(escapeCssUrl('a\\b\nc\r\nd')).toBe('url("a\\\\bcd")')
  })
})

describe('createId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'uuid-1')
    vi.stubGlobal('crypto', { randomUUID })
    expect(createId()).toBe('uuid-1')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('falls back to a hex id without randomUUID', () => {
    vi.stubGlobal('crypto', {})
    const id = createId()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('falls back when crypto is absent', () => {
    vi.stubGlobal('crypto', undefined)
    expect(createId()).toMatch(/^[0-9a-f-]{36}$/)
  })
})
