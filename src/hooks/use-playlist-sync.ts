import { useCallback, useEffect, useRef } from 'react'
import {
  clampIndex,
  findIndexById,
  removeById,
  reorder,
  withIds,
} from '../core'
import type { AudioTrack } from '../types'
import type { PlayerContext, SelectOptions } from './player-context'

/** Dependencies for {@link usePlaylistSync}. */
export interface PlaylistSyncDeps {
  /** The live `audioLists` prop (change-detected by reference). */
  audioLists: readonly AudioTrack[]
  replaceListOnUpdate: boolean
  preserveCurrentOnUpdate: boolean
  autoPlayOnListUpdate: boolean
  selectIndex(index: number, opts?: SelectOptions): void
  cancelFade(restoreGain: boolean): void
  /** Clears persisted state (used by `clearTracks`). */
  persistClear(): void
}

/** Track-list mutation API returned by {@link usePlaylistSync}. */
export interface PlaylistSyncApi {
  removeTrack(id: string): void
  clearTracks(): void
  reorderTracks(from: number, to: number): void
}

/**
 * Keeps the internal playlist in sync with the `audioLists` prop
 * (merge vs. replace, optional current-track preservation) and owns
 * the `removeTrack` / `clearTracks` / `reorderTracks` actions.
 */
export function usePlaylistSync(
  ctx: PlayerContext,
  deps: PlaylistSyncDeps,
): PlaylistSyncApi {
  const { getLatest, audioRef, patch, getAudioInfo } = ctx
  const {
    audioLists,
    replaceListOnUpdate,
    preserveCurrentOnUpdate,
    autoPlayOnListUpdate,
    selectIndex,
    cancelFade,
    persistClear,
  } = deps
  const previousListsRef = useRef(audioLists)

  // audioLists prop changes (reference inequality)
  useEffect(() => {
    if (previousListsRef.current === audioLists) return
    previousListsRef.current = audioLists
    const l = getLatest()
    if (replaceListOnUpdate) {
      const nextTracks = withIds(audioLists, l.state.tracks)
      const current = l.index >= 0 ? l.state.tracks[l.index] : undefined
      let nextIndex = -1
      if (preserveCurrentOnUpdate && current) {
        nextIndex = nextTracks.findIndex(
          (t) => t.id === current.id || t.musicSrc === current.musicSrc,
        )
      }
      if (nextIndex === -1) {
        nextIndex = clampIndex(0, nextTracks.length)
      }
      patch({ tracks: nextTracks })
      const currentTrackChanged =
        nextIndex !== l.index ||
        (current !== undefined && nextTracks[nextIndex]?.id !== current.id)
      if (currentTrackChanged || !preserveCurrentOnUpdate) {
        selectIndex(nextIndex, { autoplay: autoPlayOnListUpdate })
      }
      l.options.onTracksChange?.(nextTracks, getAudioInfo())
      return
    }
    // merge: keep existing tracks, append new ones not matching by musicSrc
    const merged = [
      ...l.state.tracks,
      ...withIds(audioLists, l.state.tracks).filter(
        (candidate) =>
          !l.state.tracks.some((t) => t.musicSrc === candidate.musicSrc),
      ),
    ]
    patch({ tracks: merged })
    l.options.onTracksChange?.(merged, getAudioInfo())
  }, [
    getLatest,
    audioLists,
    replaceListOnUpdate,
    preserveCurrentOnUpdate,
    autoPlayOnListUpdate,
    patch,
    selectIndex,
    getAudioInfo,
  ])

  const removeTrack = useCallback(
    (id: string) => {
      const l = getLatest()
      const list = l.state.tracks
      const removedIndex = findIndexById(list, id)
      if (removedIndex === -1) return
      const nextList = removeById(list, id)
      patch({ tracks: nextList })
      if (removedIndex === l.index) {
        if (nextList.length === 0) {
          audioRef.current?.pause()
          cancelFade(true)
          patch({
            index: -1,
            src: null,
            status: 'idle',
            currentTime: 0,
            duration: 0,
            buffered: 0,
            lyricIndex: -1,
          })
        } else {
          selectIndex(Math.min(removedIndex, nextList.length - 1))
        }
      } else if (removedIndex < l.index) {
        patch({ index: l.index - 1 })
      }
      l.options.onTracksChange?.(nextList, getAudioInfo())
    },
    [getLatest, audioRef, patch, selectIndex, cancelFade, getAudioInfo],
  )

  const clearTracks = useCallback(() => {
    audioRef.current?.pause()
    cancelFade(true)
    patch({
      tracks: [],
      index: -1,
      src: null,
      status: 'idle',
      currentTime: 0,
      duration: 0,
      buffered: 0,
      lyricIndex: -1,
    })
    persistClear()
    getLatest().options.onTracksChange?.([], getAudioInfo())
  }, [getLatest, audioRef, patch, cancelFade, persistClear, getAudioInfo])

  const reorderTracks = useCallback(
    (from: number, to: number) => {
      const l = getLatest()
      const reordered = reorder(l.state.tracks, from, to)
      if (reordered === l.state.tracks) return
      const currentTrack = l.index >= 0 ? l.state.tracks[l.index] : undefined
      const nextIndex = currentTrack
        ? reordered.findIndex((t) => t.id === currentTrack.id)
        : -1
      patch({ tracks: reordered, index: nextIndex })
      l.options.onTracksChange?.(reordered, getAudioInfo())
    },
    [getLatest, patch, getAudioInfo],
  )

  return { removeTrack, clearTracks, reorderTracks }
}
