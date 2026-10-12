import { PERSIST_KEY, PLAY_MODES, THEMES } from '../constants'
import type { PlayMode, Theme } from '../types'

/** Shape of the state persisted across sessions (schema version 1). */
export interface PersistedPlayerState {
  version: 1
  trackId: string | null
  musicSrc: string | null
  currentTime: number
  volume: number
  muted: boolean
  playMode: PlayMode
  theme: Theme
  playing: boolean
}

/** Minimal synchronous storage contract (satisfied by `localStorage`). */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

/** Structural type guard for {@link PersistedPlayerState}. */
export function isPersistedPlayerState(
  value: unknown,
): value is PersistedPlayerState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    (typeof v.trackId === 'string' || v.trackId === null) &&
    (typeof v.musicSrc === 'string' || v.musicSrc === null) &&
    isFiniteNumber(v.currentTime) &&
    isFiniteNumber(v.volume) &&
    typeof v.muted === 'boolean' &&
    typeof v.playing === 'boolean' &&
    (PLAY_MODES as readonly unknown[]).includes(v.playMode) &&
    (THEMES as readonly unknown[]).includes(v.theme)
  )
}

/**
 * Returns `globalThis.localStorage` when usable, else `null`
 * (Safari private mode, SSR, disabled storage).
 */
export function getDefaultStorage(): StorageLike | null {
  try {
    const storage = (globalThis as { localStorage?: StorageLike }).localStorage
    if (!storage) return null
    const probe = '__trmp_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

/** Safe read/write/clear facade over a {@link StorageLike}. */
export interface Persistence {
  /** Returns the stored state, or `null` when absent/invalid/unreadable. */
  read(): PersistedPlayerState | null
  /** Serialises `state`; quota errors are swallowed. */
  write(state: PersistedPlayerState): void
  /** Removes the stored state. */
  clear(): void
}

const noopPersistence: Persistence = {
  read: () => null,
  write: () => {},
  clear: () => {},
}

/**
 * Creates a {@link Persistence} bound to `key`. When `storage` is `null`
 * every method is a no-op.
 */
export function createPersistence(
  key: string = PERSIST_KEY,
  storage: StorageLike | null = getDefaultStorage(),
): Persistence {
  if (!storage) return noopPersistence
  return {
    read() {
      try {
        const raw = storage.getItem(key)
        if (raw === null) return null
        const parsed: unknown = JSON.parse(raw)
        return isPersistedPlayerState(parsed) ? parsed : null
      } catch {
        return null
      }
    },
    write(state) {
      try {
        storage.setItem(key, JSON.stringify(state))
      } catch {
        // quota exceeded or storage disabled — ignore
      }
    },
    clear() {
      try {
        storage.removeItem(key)
      } catch {
        // storage disabled — ignore
      }
    },
  }
}

/** Injectable timer dependencies for {@link throttle}. */
export interface ThrottleTimers {
  setTimeout?: typeof globalThis.setTimeout
  clearTimeout?: typeof globalThis.clearTimeout
  now?: () => number
}

export interface Throttled<A extends unknown[]> {
  (...args: A): void
  /** Immediately invokes with the latest pending args, if any. */
  flush(): void
  /** Drops the pending trailing call, if any. */
  cancel(): void
}

/**
 * Leading + trailing throttle: the first call runs immediately and the
 * last call inside the window is delivered when the window ends.
 */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
  timers: ThrottleTimers = {},
): Throttled<A> {
  const {
    setTimeout: setTimer = globalThis.setTimeout,
    clearTimeout: clearTimer = globalThis.clearTimeout,
    now = () => Date.now(),
  } = timers

  let lastRun = Number.NEGATIVE_INFINITY
  let timer: ReturnType<typeof setTimer> | undefined
  let pendingArgs: A | undefined

  const clearPending = () => {
    if (timer !== undefined) clearTimer(timer)
    timer = undefined
  }

  const run = (args: A) => {
    lastRun = now()
    pendingArgs = undefined
    fn(...args)
  }

  const throttled = ((...args: A) => {
    const elapsed = now() - lastRun
    if (elapsed >= waitMs) {
      clearPending()
      run(args)
      return
    }
    pendingArgs = args
    if (timer === undefined) {
      timer = setTimer(() => {
        timer = undefined
        // pendingArgs is always set while a timer is pending
        run(pendingArgs as A)
      }, waitMs - elapsed)
    }
  }) as Throttled<A>

  throttled.flush = () => {
    if (pendingArgs === undefined) return
    clearPending()
    run(pendingArgs)
  }
  throttled.cancel = () => {
    pendingArgs = undefined
    clearPending()
  }
  return throttled
}
