/** A single timed lyric line. */
export interface LyricLine {
  timeMs: number
  text: string
}

/** Metadata tags parsed from an LRC header. */
export interface LrcTags {
  title?: string
  artist?: string
  album?: string
  by?: string
  /** Offset applied to every line's timestamp. */
  offsetMs?: number
}

const TIME_TAG = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?]/g
const TAG_MAP: Record<string, keyof Omit<LrcTags, 'offsetMs'>> = {
  ti: 'title',
  ar: 'artist',
  al: 'album',
  by: 'by',
}

/**
 * Parses an LRC string into header tags and sorted lyric lines.
 * Supports `[mm:ss]`, `[mm:ss.xx]` and `[mm:ss.xxx]`, multiple timestamps
 * per line, `[offset:±ms]`, CRLF input, and drops empty lines.
 */
export function parseLrc(lrc: string | undefined | null): {
  tags: LrcTags
  lines: LyricLine[]
} {
  const tags: LrcTags = {}
  const lines: LyricLine[] = []
  if (!lrc) return { tags, lines }

  for (const raw of lrc.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    const tagMatch = line.match(/^\[([a-zA-Z]+):([^\]]*)]$/)
    if (tagMatch) {
      const key = tagMatch[1].toLowerCase()
      if (key === 'offset') {
        const offset = Number(tagMatch[2])
        if (Number.isFinite(offset)) tags.offsetMs = offset
      } else if (key in TAG_MAP) {
        tags[TAG_MAP[key]] = tagMatch[2].trim()
      }
      continue
    }

    const stamps: number[] = []
    for (const m of line.matchAll(TIME_TAG)) {
      const fraction = m[3] ?? ''
      const ms = fraction ? Number(fraction) * 10 ** (3 - fraction.length) : 0
      stamps.push(Number(m[1]) * 60_000 + Number(m[2]) * 1000 + ms)
    }
    if (stamps.length === 0) continue

    const text = line.replace(TIME_TAG, '').trim()
    if (!text) continue
    for (const timeMs of stamps) lines.push({ timeMs, text })
  }

  if (tags.offsetMs) {
    for (const line of lines) line.timeMs += tags.offsetMs
  }
  lines.sort((a, b) => a.timeMs - b.timeMs)
  return { tags, lines }
}

/**
 * Returns the index of the last line whose `timeMs` is <= `timeMs`
 * (the currently sung line), or `-1` before the first line.
 */
export function findLineIndex(
  lines: readonly LyricLine[],
  timeMs: number,
): number {
  let lo = 0
  let hi = lines.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].timeMs <= timeMs) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}

/** Injectable clock/timer dependencies for {@link createLyricScheduler}. */
export interface LyricSchedulerOptions {
  now?: () => number
  setTimeout?: typeof globalThis.setTimeout
  clearTimeout?: typeof globalThis.clearTimeout
}

/** Time-driven lyric emitter returned by {@link createLyricScheduler}. */
export interface LyricScheduler {
  readonly lines: readonly LyricLine[]
  readonly playing: boolean
  /** Emits the current line then schedules the rest. Resumes after pause. */
  play(fromMs?: number): void
  /** Suspends emission, keeping the current position. */
  pause(): void
  /** Re-anchors to `toMs`; keeps playing only if it was already playing. */
  seek(toMs: number): void
  /** Clears timers and resets the position to `0`. */
  stop(): void
}

/**
 * Creates a scheduler that emits each lyric line at its timestamp,
 * driven by an injectable `now()` and timer functions.
 */
export function createLyricScheduler(
  lines: readonly LyricLine[],
  onLine: (line: LyricLine, index: number) => void,
  options: LyricSchedulerOptions = {},
): LyricScheduler {
  const {
    now = () => Date.now(),
    setTimeout: setTimer = globalThis.setTimeout,
    clearTimeout: clearTimer = globalThis.clearTimeout,
  } = options

  let playing = false
  let positionMs = 0
  let anchorNow = 0
  let timer: ReturnType<typeof setTimer> | undefined
  let nextIndex = 0

  const clearPending = () => {
    if (timer !== undefined) clearTimer(timer)
    timer = undefined
  }

  let lastEmittedIndex = -1
  const emit = (index: number) => {
    if (index >= 0 && index < lines.length) {
      lastEmittedIndex = index
      onLine(lines[index], index)
    }
  }

  const scheduleNext = () => {
    clearPending()
    nextIndex = findLineIndexAfter(positionMs + (now() - anchorNow))
    if (nextIndex >= lines.length) return
    const delay = Math.max(
      0,
      lines[nextIndex].timeMs - (positionMs + (now() - anchorNow)),
    )
    timer = setTimer(() => {
      emit(nextIndex)
      scheduleNext()
    }, delay)
  }

  // first index strictly after the given time
  const findLineIndexAfter = (timeMs: number) =>
    findLineIndex(lines, timeMs) + 1

  const currentPosition = () =>
    playing ? positionMs + (now() - anchorNow) : positionMs

  const startFrom = (fromMs: number, emitCurrent: boolean) => {
    clearPending()
    playing = true
    positionMs = Math.max(0, fromMs)
    anchorNow = now()
    const index = findLineIndex(lines, positionMs)
    if (emitCurrent && index !== lastEmittedIndex) emit(index)
    scheduleNext()
  }

  return {
    lines,
    get playing() {
      return playing
    },
    play(fromMs) {
      startFrom(fromMs ?? currentPosition(), true)
    },
    pause() {
      if (!playing) return
      positionMs = currentPosition()
      playing = false
      clearPending()
    },
    seek(toMs: number) {
      positionMs = Math.max(0, toMs)
      emit(findLineIndex(lines, positionMs))
      if (playing) {
        anchorNow = now()
        scheduleNext()
      }
    },
    stop() {
      playing = false
      positionMs = 0
      clearPending()
    },
  }
}
