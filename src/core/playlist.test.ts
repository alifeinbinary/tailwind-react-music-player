import { describe, expect, it } from 'vitest'
import type { AudioTrack, PlaylistItem } from '../types'
import {
  adjacentIndex,
  clampIndex,
  findIndexById,
  matchByMusicSrc,
  nextIndexOnEnded,
  removeById,
  reorder,
  withIds,
} from './playlist'

const track = (musicSrc: AudioTrack['musicSrc']): AudioTrack => ({ musicSrc })
const item = (id: string, musicSrc = `s-${id}`): PlaylistItem => ({
  id,
  musicSrc,
})

describe('matchByMusicSrc', () => {
  it('matches string sources by value', () => {
    expect(matchByMusicSrc(track('a'), track('a'))).toBe(true)
    expect(matchByMusicSrc(track('a'), track('b'))).toBe(false)
  })

  it('matches function sources by reference', () => {
    const fn = () => Promise.resolve('x')
    expect(matchByMusicSrc(track(fn), track(fn))).toBe(true)
    expect(
      matchByMusicSrc(
        track(fn),
        track(() => Promise.resolve('x')),
      ),
    ).toBe(false)
  })
})

describe('withIds', () => {
  it('creates ids for new tracks', () => {
    const [a, b] = withIds([track('a'), track('b')])
    expect(a.id).toBeTruthy()
    expect(b.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })

  it('reuses ids of matching previous items', () => {
    const prev = [item('p1', 'a'), item('p2', 'b')]
    const next = withIds([track('b'), track('a')], prev)
    expect(next[0].id).toBe('p2')
    expect(next[1].id).toBe('p1')
  })

  it('uses each previous id at most once with duplicate sources', () => {
    const prev = [item('p1', 'dup'), item('p2', 'dup')]
    const next = withIds([track('dup'), track('dup'), track('dup')], prev)
    expect(next[0].id).toBe('p1')
    expect(next[1].id).toBe('p2')
    expect(next[2].id).not.toBe('p1')
    expect(next[2].id).not.toBe('p2')
  })

  it('keeps explicit ids on input tracks', () => {
    const [a] = withIds([
      { ...track('x'), id: 'keep-me' } as PlaylistItem,
      track('x'),
    ])
    expect(a.id).toBe('keep-me')
  })

  it('supports a custom matcher', () => {
    const byName = (a: AudioTrack, b: AudioTrack) => a.name === b.name
    const prev = [item('p1', 'src1')]
    prev[0].name = 'song'
    const [next] = withIds(
      [{ ...track('other-src'), name: 'song' }],
      prev,
      byName,
    )
    expect(next.id).toBe('p1')
  })

  it('does not mutate inputs', () => {
    const tracks = [track('a')]
    const prev = [item('p1', 'a')]
    const result = withIds(tracks, prev)
    expect(tracks[0]).not.toHaveProperty('id')
    expect(prev[0]).toBe(prev[0])
    expect(result[0]).not.toBe(tracks[0])
  })

  it('handles function musicSrc identity', () => {
    const fn = () => Promise.resolve('x')
    const prev = [item('pf')]
    prev[0].musicSrc = fn
    const [next] = withIds([track(fn)], prev)
    expect(next.id).toBe('pf')
  })
})

describe('findIndexById', () => {
  const list = [item('a'), item('b')]
  it.each([
    ['a', 0],
    ['b', 1],
    ['zz', -1],
    [null, -1],
    [undefined, -1],
  ] as const)('findIndexById(%s) === %s', (id, expected) => {
    expect(findIndexById(list, id)).toBe(expected)
  })
})

describe('removeById', () => {
  const list = [item('a'), item('b'), item('c')]
  it('removes the matching item without mutating', () => {
    const next = removeById(list, 'b')
    expect(next.map((i) => i.id)).toEqual(['a', 'c'])
    expect(list).toHaveLength(3)
  })

  it('returns an equal list when id is absent', () => {
    expect(removeById(list, 'zz').map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('reorder', () => {
  const list = ['a', 'b', 'c', 'd']
  it('moves an element forward and backward', () => {
    expect(reorder(list, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(reorder(list, 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it.each([
    [1, 1],
    [-1, 2],
    [2, -1],
    [4, 1],
    [1, 4],
  ])('returns the same ref for no-op reorder(%s, %s)', (from, to) => {
    expect(reorder(list, from, to)).toBe(list)
  })
})

describe('clampIndex', () => {
  it.each([
    [5, 3, 2],
    [-2, 3, 0],
    [1, 3, 1],
    [0, 0, -1],
    [5, 0, -1],
  ])('clampIndex(%s, %s) === %s', (index, length, expected) => {
    expect(clampIndex(index, length)).toBe(expected)
  })
})

describe('nextIndexOnEnded', () => {
  it.each([
    // order
    ['order', 0, 3, 1],
    ['order', 2, 3, null],
    ['order', 0, 1, null],
    ['order', -1, 3, 0],
    ['order', 0, 0, null],
    // orderLoop
    ['orderLoop', 0, 3, 1],
    ['orderLoop', 2, 3, 0],
    ['orderLoop', 0, 1, 0],
    ['orderLoop', -1, 3, 0],
    ['orderLoop', 0, 0, null],
    // singleLoop
    ['singleLoop', 0, 3, 0],
    ['singleLoop', 2, 3, 2],
    ['singleLoop', -1, 3, 0],
    ['singleLoop', 0, 0, null],
    // shufflePlay
    ['shufflePlay', -1, 3, 0],
    ['shufflePlay', 0, 0, null],
    ['shufflePlay', 0, 1, 0],
  ] as const)(
    'mode %s current %s length %s -> %s',
    (mode, cur, len, expected) => {
      expect(nextIndexOnEnded(mode, cur, len, () => 0.5)).toBe(expected)
    },
  )

  it('never returns the current index for shufflePlay', () => {
    let calls = 0
    const random = () => (calls++ === 0 ? 0 : 0.99) // first draw = current(0)
    expect(nextIndexOnEnded('shufflePlay', 0, 3, random)).toBe(2)
    expect(calls).toBe(2)
  })
})

describe('adjacentIndex', () => {
  it.each([
    // next
    ['next', 'order', 0, 3, 1],
    ['next', 'order', 2, 3, 0],
    ['next', 'orderLoop', 1, 3, 2],
    ['next', 'singleLoop', 2, 3, 0],
    ['next', 'order', -1, 3, 0],
    ['next', 'order', 0, 0, null],
    // prev
    ['prev', 'order', 0, 3, 2],
    ['prev', 'order', 2, 3, 1],
    ['prev', 'orderLoop', 0, 1, 0],
    ['prev', 'singleLoop', 0, 3, 2],
    ['prev', 'order', -1, 3, 0],
    ['prev', 'order', 0, 0, null],
    // shuffle
    ['next', 'shufflePlay', -1, 3, 0],
    ['next', 'shufflePlay', 0, 0, null],
    ['next', 'shufflePlay', 0, 1, 0],
  ] as const)(
    '%s mode %s current %s length %s -> %s',
    (dir, mode, cur, len, expected) => {
      expect(adjacentIndex(dir, mode, cur, len, () => 0.5)).toBe(expected)
    },
  )

  it('never returns the current index for shufflePlay', () => {
    let calls = 0
    const random = () => (calls++ === 0 ? 0.4 : 0.9) // first draw = current(1)
    expect(adjacentIndex('next', 'shufflePlay', 1, 3, random)).toBe(2)
    expect(calls).toBe(2)
  })
})
