import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFade, gainToSlider, sliderToGain, swing } from './volume-fade'

describe('curves', () => {
  it('swing endpoints and midpoint', () => {
    expect(swing(0)).toBeCloseTo(0)
    expect(swing(0.5)).toBeCloseTo(0.5)
    expect(swing(1)).toBeCloseTo(1)
  })

  it('sliderToGain / gainToSlider round-trip', () => {
    expect(sliderToGain(0)).toBe(0)
    expect(sliderToGain(1)).toBe(1)
    expect(sliderToGain(0.5)).toBeCloseTo(0.25)
    expect(gainToSlider(0.25)).toBeCloseTo(0.5)
    expect(sliderToGain(-1)).toBe(0)
    expect(sliderToGain(2)).toBe(1)
    expect(gainToSlider(-1)).toBe(0)
    expect(gainToSlider(4)).toBe(1)
  })
})

describe('createFade', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('applies `to` synchronously when durationMs <= 0', async () => {
    const applied: number[] = []
    const fade = createFade((g) => applied.push(g), {
      from: 0,
      to: 1,
      durationMs: 0,
    })
    expect(applied).toEqual([1])
    expect(fade.active).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    await expect(fade.done).resolves.toBe('completed')
  })

  it('applies `to` synchronously when from === to', async () => {
    const applied: number[] = []
    const fade = createFade((g) => applied.push(g), {
      from: 0.5,
      to: 0.5,
      durationMs: 500,
    })
    expect(applied).toEqual([0.5])
    expect(fade.active).toBe(false)
    await expect(fade.done).resolves.toBe('completed')
  })

  it('fades monotonically up and lands exactly on `to`', async () => {
    const applied: number[] = []
    const fade = createFade((g) => applied.push(g), {
      from: 0,
      to: 1,
      durationMs: 130,
      intervalMs: 13,
    })
    expect(fade.active).toBe(true)
    vi.advanceTimersByTime(130)
    expect(applied.length).toBe(10)
    for (let i = 1; i < applied.length; i++) {
      expect(applied[i]).toBeGreaterThan(applied[i - 1])
    }
    expect(applied[applied.length - 1]).toBe(1)
    expect(fade.active).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    await expect(fade.done).resolves.toBe('completed')
  })

  it('fades down', () => {
    const applied: number[] = []
    createFade((g) => applied.push(g), { from: 1, to: 0, durationMs: 26 })
    vi.advanceTimersByTime(26)
    expect(applied[0]).toBeLessThan(1)
    expect(applied[applied.length - 1]).toBe(0)
  })

  it('retarget changes the destination mid-fade', () => {
    const applied: number[] = []
    const fade = createFade((g) => applied.push(g), {
      from: 0,
      to: 1,
      durationMs: 130,
      intervalMs: 13,
      easing: (p) => p,
    })
    vi.advanceTimersByTime(65) // halfway, gain ~0.5
    fade.retarget(0)
    vi.advanceTimersByTime(65)
    expect(applied[applied.length - 1]).toBe(0)
  })

  it('cancel stops the fade and resolves cancelled', async () => {
    const applied: number[] = []
    const fade = createFade((g) => applied.push(g), {
      from: 0,
      to: 1,
      durationMs: 130,
    })
    vi.advanceTimersByTime(26)
    const lastValue = applied[applied.length - 1]
    fade.cancel()
    expect(fade.active).toBe(false)
    vi.advanceTimersByTime(200)
    expect(applied[applied.length - 1]).toBe(lastValue)
    expect(vi.getTimerCount()).toBe(0)
    await expect(fade.done).resolves.toBe('cancelled')
  })

  it('cancel is idempotent and a no-op after completion', async () => {
    const fade = createFade(() => {}, { from: 0, to: 1, durationMs: 26 })
    vi.advanceTimersByTime(26)
    await expect(fade.done).resolves.toBe('completed')
    fade.cancel()
    fade.cancel()
    await expect(fade.done).resolves.toBe('completed')
  })

  it('cancel twice mid-fade resolves once', async () => {
    const fade = createFade(() => {}, { from: 0, to: 1, durationMs: 130 })
    vi.advanceTimersByTime(13)
    fade.cancel()
    fade.cancel()
    await expect(fade.done).resolves.toBe('cancelled')
  })

  it('retarget is a no-op on a synchronous fade', () => {
    const applied: number[] = []
    const fade = createFade((g) => applied.push(g), {
      from: 0,
      to: 1,
      durationMs: 0,
    })
    fade.retarget(0.5)
    fade.cancel()
    expect(applied).toEqual([1])
  })

  it('supports injected timers', async () => {
    const applied: number[] = []
    const fakeSet = vi.fn((cb: () => void) => {
      cb()
      return 1 as unknown as ReturnType<typeof setInterval>
    })
    const fakeClear = vi.fn()
    const fade = createFade((g) => applied.push(g), {
      from: 0,
      to: 1,
      durationMs: 13,
      intervalMs: 13,
      setInterval: fakeSet as unknown as typeof setInterval,
      clearInterval: fakeClear as unknown as typeof clearInterval,
    })
    expect(fakeSet).toHaveBeenCalledOnce()
    await expect(fade.done).resolves.toBe('completed')
    expect(applied[applied.length - 1]).toBe(1)
  })
})
