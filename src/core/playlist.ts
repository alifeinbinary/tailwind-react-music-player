import type { AudioTrack, PlayMode, PlaylistItem } from '../types'
import { createId, randomInt } from './format'

/**
 * Identity predicate used to match tracks across playlist updates:
 * string sources compare by value, function sources by reference.
 */
export const matchByMusicSrc = (a: AudioTrack, b: AudioTrack): boolean =>
  a.musicSrc === b.musicSrc

/**
 * Assigns a stable `id` to every track. Tracks that already carry an `id`
 * keep it; otherwise the id of the first still-unused matching item in
 * `previous` is reused (each previous id is reused at most once), and
 * remaining tracks get a fresh id. Inputs are never mutated.
 */
export function withIds(
  tracks: readonly AudioTrack[],
  previous: readonly PlaylistItem[] = [],
  match: (a: AudioTrack, b: AudioTrack) => boolean = matchByMusicSrc,
): PlaylistItem[] {
  const used = new Set<string>()
  return tracks.map((track) => {
    const explicit = (track as PlaylistItem).id
    if (typeof explicit === 'string') {
      used.add(explicit)
      return { ...track, id: explicit }
    }
    const prev = previous.find((p) => !used.has(p.id) && match(track, p))
    const id = prev ? prev.id : createId()
    used.add(id)
    return { ...track, id }
  })
}

/** Returns the index of the item with `id`, or `-1` when absent. */
export function findIndexById(
  list: readonly PlaylistItem[],
  id: string | null | undefined,
): number {
  if (id == null) return -1
  return list.findIndex((item) => item.id === id)
}

/** Returns a new list without the item with `id` (same ref when absent). */
export function removeById(
  list: readonly PlaylistItem[],
  id: string,
): PlaylistItem[] {
  const index = findIndexById(list, id)
  if (index === -1) return list as PlaylistItem[]
  return [...list.slice(0, index), ...list.slice(index + 1)]
}

/**
 * Moves the element at `from` to index `to`. Returns the same array
 * reference when the move is a no-op or either index is out of range.
 */
export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return list as T[]
  }
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Clamps `index` into `0..length-1`; returns `-1` for an empty list. */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) return -1
  return Math.min(Math.max(index, 0), length - 1)
}

const pickShuffle = (
  current: number,
  length: number,
  random: () => number,
): number => {
  if (length <= 1) return current
  let next = randomInt(0, length - 1, random)
  while (next === current) {
    next = randomInt(0, length - 1, random)
  }
  return next
}

/**
 * Index to auto-play when the current track ends. `null` means stop.
 * `order` stops at the end; `orderLoop` wraps; `singleLoop` repeats;
 * `shufflePlay` picks a different random index. An empty list yields `null`;
 * `current === -1` (nothing selected) starts at `0`.
 */
export function nextIndexOnEnded(
  mode: PlayMode,
  current: number,
  length: number,
  random: () => number = Math.random,
): number | null {
  if (length === 0) return null
  if (current === -1) return 0
  switch (mode) {
    case 'order':
      return current + 1 < length ? current + 1 : null
    case 'orderLoop':
      return (current + 1) % length
    case 'singleLoop':
      return current
    case 'shufflePlay':
      return pickShuffle(current, length, random)
  }
}

/**
 * Index used by the prev/next buttons. `shufflePlay` picks a different
 * random index; every other mode wraps in the given direction.
 * Same empty-list / `-1` rules as {@link nextIndexOnEnded}.
 */
export function adjacentIndex(
  direction: 'next' | 'prev',
  mode: PlayMode,
  current: number,
  length: number,
  random: () => number = Math.random,
): number | null {
  if (length === 0) return null
  if (current === -1) return 0
  if (mode === 'shufflePlay') return pickShuffle(current, length, random)
  const delta = direction === 'next' ? 1 : -1
  return (current + delta + length) % length
}
