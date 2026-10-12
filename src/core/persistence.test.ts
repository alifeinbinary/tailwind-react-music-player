import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPersistence,
  getDefaultStorage,
  isPersistedPlayerState,
  throttle,
  type PersistedPlayerState,
  type StorageLike,
} from './persistence'

const validState: PersistedPlayerState = {
  version: 1,
  trackId: 't1',
  musicSrc: 'a.mp3',
  currentTime: 12.5,
  volume: 0.8,
  muted: false,
  playMode: 'orderLoop',
  theme: 'dark',
  playing: true,
}

const memoryStorage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('isPersistedPlayerState', () => {
  it('accepts a valid state', () => {
    expect(isPersistedPlayerState(validState)).toBe(true)
    expect(isPersistedPlayerState({ ...validState, trackId: null })).toBe(true)
    expect(isPersistedPlayerState({ ...validState, musicSrc: null })).toBe(true)
  })

  it.each([
    null,
    undefined,
    42,
    'state',
    {},
    { ...validState, version: 2 },
    { ...validState, version: '1' },
    { ...validState, trackId: 5 },
    { ...validState, musicSrc: {} },
    { ...validState, currentTime: '12' },
    { ...validState, currentTime: NaN },
    { ...validState, volume: Infinity },
    { ...validState, muted: 'yes' },
    { ...validState, playing: 1 },
    { ...validState, playMode: 'bogus' },
    { ...validState, theme: 'purple' },
  ])('rejects %j', (value) => {
    expect(isPersistedPlayerState(value)).toBe(false)
  })
})

describe('getDefaultStorage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns localStorage when usable', () => {
    expect(getDefaultStorage()).toBe(globalThis.localStorage)
  })

  it('returns null when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {},
    })
    expect(getDefaultStorage()).toBeNull()
  })

  it('returns null when localStorage is absent', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(getDefaultStorage()).toBeNull()
  })
})

describe('createPersistence', () => {
  it('round-trips a state', () => {
    const p = createPersistence('k', memoryStorage())
    p.write(validState)
    expect(p.read()).toEqual(validState)
  })

  it('read returns null for a missing key', () => {
    expect(createPersistence('k', memoryStorage()).read()).toBeNull()
  })

  it('read returns null for invalid JSON', () => {
    const storage = memoryStorage()
    storage.setItem('k', '{oops')
    expect(createPersistence('k', storage).read()).toBeNull()
  })

  it('read returns null when the guard fails', () => {
    const storage = memoryStorage()
    storage.setItem('k', JSON.stringify({ version: 99 }))
    expect(createPersistence('k', storage).read()).toBeNull()
  })

  it('read returns null when getItem throws', () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {},
      removeItem: () => {},
    }
    expect(createPersistence('k', storage).read()).toBeNull()
  })

  it('write swallows quota errors', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {},
    }
    expect(() =>
      createPersistence('k', storage).write(validState),
    ).not.toThrow()
  })

  it('clear removes the key and swallows errors', () => {
    const storage = memoryStorage()
    const p = createPersistence('k', storage)
    p.write(validState)
    p.clear()
    expect(p.read()).toBeNull()
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('denied')
      },
    }
    expect(() => createPersistence('k', throwing).clear()).not.toThrow()
  })

  it('null storage makes every method a no-op', () => {
    const p = createPersistence('k', null)
    expect(p.read()).toBeNull()
    expect(() => p.write(validState)).not.toThrow()
    expect(() => p.clear()).not.toThrow()
  })

  it('uses the default key and default storage', () => {
    const p = createPersistence()
    p.write(validState)
    expect(localStorage.getItem('trmp:player')).toBeTruthy()
    p.clear()
  })
})

describe('throttle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs the first call immediately (leading)', () => {
    const fn = vi.fn()
    const t = throttle(fn, 100)
    t('a')
    expect(fn).toHaveBeenCalledWith('a')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('delivers the last call at window end (trailing)', () => {
    const fn = vi.fn()
    const t = throttle(fn, 100)
    t(1)
    t(2)
    t(3)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(3)
  })

  it('runs immediately once the window has passed', () => {
    const fn = vi.fn()
    const t = throttle(fn, 100)
    t(1)
    vi.advanceTimersByTime(150)
    t(2)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(2)
  })

  it('schedules only one trailing timer for rapid calls', () => {
    const fn = vi.fn()
    const t = throttle(fn, 100)
    t(1)
    t(2)
    t(3)
    t(4)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenLastCalledWith(4)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('flush invokes the pending call immediately', () => {
    const fn = vi.fn()
    const t = throttle(fn, 100)
    t(1)
    t(2)
    t.flush()
    expect(fn).toHaveBeenLastCalledWith(2)
    expect(fn).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2) // no double delivery
  })

  it('flush without a pending call is a no-op', () => {
    const fn = vi.fn()
    const t = throttle(fn, 100)
    t(1)
    t.flush()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('cancel drops the pending call', () => {
    const fn = vi.fn()
    const t = throttle(fn, 100)
    t(1)
    t(2)
    t.cancel()
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('supports injected timers', () => {
    vi.useRealTimers()
    let t = 0
    const timers: (() => void)[] = []
    const fn = vi.fn()
    const throttled = throttle(fn, 100, {
      now: () => t,
      setTimeout: ((cb: () => void) => {
        timers.push(cb)
        return timers.length
      }) as unknown as typeof setTimeout,
      clearTimeout: (() => {}) as unknown as typeof clearTimeout,
    })
    throttled('a')
    throttled('b')
    expect(timers).toHaveLength(1)
    t += 100
    timers[0]()
    expect(fn).toHaveBeenLastCalledWith('b')
    vi.useFakeTimers()
  })
})
