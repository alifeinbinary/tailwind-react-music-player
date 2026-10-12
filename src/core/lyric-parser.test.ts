import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createLyricScheduler,
  findLineIndex,
  parseLrc,
  type LyricLine,
} from './lyric-parser'

describe('parseLrc', () => {
  it('parses simple lines', () => {
    const { lines } = parseLrc('[00:01.00]one\n[00:02.50]two')
    expect(lines).toEqual([
      { timeMs: 1000, text: 'one' },
      { timeMs: 2500, text: 'two' },
    ])
  })

  it('handles 2-digit and 3-digit fractions correctly', () => {
    const { lines } = parseLrc('[00:01.23]a\n[00:02.456]b')
    expect(lines[0].timeMs).toBe(1230)
    expect(lines[1].timeMs).toBe(2456)
  })

  it('handles missing fraction', () => {
    expect(parseLrc('[01:05]x').lines[0].timeMs).toBe(65000)
  })

  it('expands multiple timestamps on one line', () => {
    const { lines } = parseLrc('[00:01.00][00:05.00]text')
    expect(lines).toEqual([
      { timeMs: 1000, text: 'text' },
      { timeMs: 5000, text: 'text' },
    ])
  })

  it('parses metadata tags', () => {
    const { tags } = parseLrc(
      '[ti:Song]\n[ar:Artist]\n[al:Album]\n[by:Me]\n[00:01.00]x',
    )
    expect(tags).toEqual({
      title: 'Song',
      artist: 'Artist',
      album: 'Album',
      by: 'Me',
      offsetMs: undefined,
    })
  })

  it('applies a positive and negative offset', () => {
    expect(parseLrc('[offset:500]\n[00:01.00]x').lines[0].timeMs).toBe(1500)
    expect(parseLrc('[offset:-250]\n[00:01.00]x').lines[0].timeMs).toBe(750)
    expect(parseLrc('[offset:500]\n[00:01.00]x').tags.offsetMs).toBe(500)
  })

  it('ignores a non-numeric offset', () => {
    const { tags, lines } = parseLrc('[offset:abc]\n[00:01.00]x')
    expect(tags.offsetMs).toBeUndefined()
    expect(lines[0].timeMs).toBe(1000)
  })

  it('sorts lines by time stably', () => {
    const { lines } = parseLrc('[00:05.00]b\n[00:01.00]a\n[00:01.00]a2')
    expect(lines.map((l) => l.text)).toEqual(['a', 'a2', 'b'])
  })

  it('drops empty-text lines and non-lrc lines', () => {
    const { lines } = parseLrc('[00:01.00]\nplain text\n[00:02.00]x')
    expect(lines).toEqual([{ timeMs: 2000, text: 'x' }])
  })

  it('tolerates CRLF and blank lines', () => {
    const { lines } = parseLrc('[00:01.00]a\r\n\r\n[00:02.00]b')
    expect(lines).toHaveLength(2)
  })

  it.each([[''], [undefined], [null]])(
    'empty input %s yields empty result',
    (input) => {
      const { tags, lines } = parseLrc(input)
      expect(tags).toEqual({})
      expect(lines).toEqual([])
    },
  )

  it('ignores unknown tags', () => {
    const { tags } = parseLrc('[xx:whatever]\n[00:01.00]x')
    expect(tags).toEqual({})
  })
})

describe('findLineIndex', () => {
  const lines: LyricLine[] = [
    { timeMs: 1000, text: 'a' },
    { timeMs: 2000, text: 'b' },
    { timeMs: 2000, text: 'b2' },
    { timeMs: 4000, text: 'c' },
  ]

  it.each([
    [0, -1],
    [999, -1],
    [1000, 0],
    [1500, 0],
    [2000, 2], // last line with timeMs <= t
    [3999, 2],
    [4000, 3],
    [99999, 3],
  ])('findLineIndex(lines, %s) === %s', (t, expected) => {
    expect(findLineIndex(lines, t)).toBe(expected)
  })

  it('returns -1 for empty lines', () => {
    expect(findLineIndex([], 100)).toBe(-1)
  })
})

describe('createLyricScheduler', () => {
  const lines: LyricLine[] = [
    { timeMs: 1000, text: 'a' },
    { timeMs: 2000, text: 'b' },
    { timeMs: 3000, text: 'c' },
  ]

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const make = (emitted: [string, number][]) =>
    createLyricScheduler(lines, (line, i) => emitted.push([line.text, i]))

  it('emits the current line on play then schedules the next', () => {
    const emitted: [string, number][] = []
    const s = make(emitted)
    s.play(0)
    expect(emitted).toEqual([]) // no line at t=0
    vi.advanceTimersByTime(1000)
    expect(emitted).toEqual([['a', 0]])
    vi.advanceTimersByTime(1000)
    expect(emitted).toEqual([
      ['a', 0],
      ['b', 1],
    ])
    expect(s.playing).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('emits the current line when starting mid-track', () => {
    const emitted: [string, number][] = []
    make(emitted).play(2500)
    expect(emitted).toEqual([['b', 1]])
    vi.advanceTimersByTime(500)
    expect(emitted).toEqual([
      ['b', 1],
      ['c', 2],
    ])
  })

  it('pause keeps position and clears timers; resume continues', () => {
    const emitted: [string, number][] = []
    const s = make(emitted)
    s.play(0)
    vi.advanceTimersByTime(1500) // emitted a, waiting for b
    s.pause()
    expect(s.playing).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(10000)
    expect(emitted).toEqual([['a', 0]])
    s.play() // resume at ~1500 — same line index, no re-emit
    expect(emitted).toEqual([['a', 0]])
    vi.advanceTimersByTime(500)
    expect(emitted).toEqual([
      ['a', 0],
      ['b', 1],
    ])
    vi.advanceTimersByTime(1000)
    expect(emitted).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ])
  })

  it('pause before playing is a no-op', () => {
    const s = make([])
    s.pause()
    expect(s.playing).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('seek re-anchors and emits the new current line while playing', () => {
    const emitted: [string, number][] = []
    const s = make(emitted)
    s.play(0)
    vi.advanceTimersByTime(1000)
    s.seek(2500)
    expect(emitted[emitted.length - 1]).toEqual(['b', 1])
    vi.advanceTimersByTime(500)
    expect(emitted[emitted.length - 1]).toEqual(['c', 2])
    expect(vi.getTimerCount()).toBe(0) // no further lines to schedule
  })

  it('seek while paused emits the line but does not play', () => {
    const emitted: [string, number][] = []
    const s = make(emitted)
    s.seek(2000)
    expect(emitted).toEqual([['b', 1]])
    expect(s.playing).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(10000)
    expect(emitted).toHaveLength(1)
  })

  it('stop clears timers and resets position', () => {
    const emitted: [string, number][] = []
    const s = make(emitted)
    s.play(2000)
    vi.advanceTimersByTime(500)
    s.stop()
    expect(s.playing).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    const count = emitted.length
    s.play() // position reset to 0 — no line there
    expect(emitted).toHaveLength(count)
    vi.advanceTimersByTime(1000)
    expect(emitted[emitted.length - 1]).toEqual(['a', 0])
  })

  it('does not emit or schedule for empty lines', () => {
    const emitted: [string, number][] = []
    const s = createLyricScheduler([], (l, i) => emitted.push([l.text, i]))
    s.play()
    expect(emitted).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
    s.seek(500)
    expect(emitted).toEqual([])
  })

  it('respects an injected clock and timers', () => {
    vi.useRealTimers()
    let t = 0
    const pending: (() => void)[] = []
    const emitted: [string, number][] = []
    const s = createLyricScheduler(
      lines,
      (line, i) => emitted.push([line.text, i]),
      {
        now: () => t,
        setTimeout: ((cb: () => void) => {
          pending.push(cb)
          return pending.length
        }) as unknown as typeof setTimeout,
        clearTimeout: (() => {}) as unknown as typeof clearTimeout,
      },
    )
    s.play(0)
    expect(pending).toHaveLength(1)
    t = 1000
    pending.shift()!()
    expect(emitted).toEqual([['a', 0]])
    expect(pending).toHaveLength(1)
    s.stop()
    vi.useFakeTimers()
  })
})
