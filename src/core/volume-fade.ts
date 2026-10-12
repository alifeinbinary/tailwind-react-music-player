import { clamp } from './format'

/** Cosine ease-in-out easing function (`p` in `0..1`). */
export const swing = (p: number): number => 0.5 - Math.cos(p * Math.PI) / 2

/** Maps a linear slider value (0..1) to a perceptual gain. */
export const sliderToGain = (v: number): number => clamp(v, 0, 1) ** 2

/** Maps a gain (0..1) back to the linear slider value. */
export const gainToSlider = (g: number): number => Math.sqrt(clamp(g, 0, 1))

/** Options accepted by {@link createFade}. */
export interface FadeOptions {
  from: number
  to: number
  durationMs: number
  /** Tick interval in ms (default `13`). */
  intervalMs?: number
  /** Easing function mapping progress `0..1` to `0..1` (default {@link swing}). */
  easing?: (p: number) => number
  setInterval?: typeof globalThis.setInterval
  clearInterval?: typeof globalThis.clearInterval
}

/** How a fade ended. */
export type FadeOutcome = 'completed' | 'cancelled'

/** Handle returned by {@link createFade}. */
export interface FadeHandle {
  /** Resolves once the fade completes or is cancelled. */
  readonly done: Promise<FadeOutcome>
  /** Whether the fade is still ticking. */
  readonly active: boolean
  /** Changes the fade target; subsequent ticks interpolate towards it. */
  retarget(to: number): void
  /** Stops the fade, leaving the current gain where it is. Idempotent. */
  cancel(): void
}

/**
 * Drives `apply(gain)` on a timer from `from` to `to` over `durationMs`.
 * A zero duration or `from === to` applies `to` synchronously.
 */
export function createFade(
  apply: (gain: number) => void,
  options: FadeOptions,
): FadeHandle {
  const {
    from,
    durationMs,
    intervalMs = 13,
    easing = swing,
    setInterval: setTimer = globalThis.setInterval,
    clearInterval: clearTimer = globalThis.clearInterval,
  } = options
  let to = options.to
  let elapsed = 0
  let active = false
  let timer: ReturnType<typeof setTimer> | undefined
  let resolveDone!: (outcome: FadeOutcome) => void
  const done = new Promise<FadeOutcome>((resolve) => {
    resolveDone = resolve
  })

  const finish = (outcome: FadeOutcome) => {
    if (!active) return
    active = false
    if (timer !== undefined) clearTimer(timer)
    timer = undefined
    resolveDone(outcome)
  }

  const ticks = Math.max(1, Math.ceil(durationMs / intervalMs))
  if (durationMs <= 0 || from === to) {
    apply(to)
    resolveDone('completed')
    return {
      done,
      get active() {
        return active
      },
      retarget: () => {},
      cancel: () => {},
    }
  }

  active = true
  timer = setTimer(() => {
    elapsed += 1
    if (elapsed >= ticks) {
      apply(to)
      finish('completed')
      return
    }
    apply(from + easing(elapsed / ticks) * (to - from))
  }, intervalMs)

  return {
    done,
    get active() {
      return active
    },
    retarget(next: number) {
      to = next
    },
    cancel() {
      finish('cancelled')
    },
  }
}
