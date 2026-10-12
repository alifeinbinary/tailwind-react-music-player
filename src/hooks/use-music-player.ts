import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { RefObject } from 'react'
import { DEFAULT_VOLUME, MEDIA_QUERY } from '../constants'
import { clampIndex, parseLrc, withIds } from '../core'
import type {
  AudioInfo,
  MusicPlayerActions,
  MusicPlayerAudioProps,
  MusicPlayerState,
  PlayMode,
  PlayerMode,
  Theme,
  UseMusicPlayerOptions,
  UseMusicPlayerResult,
} from '../types'
import type {
  InternalState,
  PlayerContext,
  PlayerLatest,
} from './player-context'
import { useAudioEvents } from './use-audio-events'
import { useAudioSource } from './use-audio-source'
import { useControllableState } from './use-controllable-state'
import { useDownload } from './use-download'
import { useLyricSync } from './use-lyric-sync'
import { useMediaQuery } from './use-media-query'
import { useMediaSession } from './use-media-session'
import { usePersistedState } from './use-persisted-state'
import { usePlaybackEvents } from './use-playback-events'
import { usePlayerActions } from './use-player-actions'
import { usePlaylistSync } from './use-playlist-sync'
import { useResolvedTheme } from './use-system-theme'
import { useVolumeFade } from './use-volume-fade'

const reducer = (
  state: InternalState,
  action: { type: 'patch'; patch: Partial<InternalState> },
): InternalState => ({ ...state, ...action.patch })

/**
 * Headless music player hook: owns playlist, playback, volume/mute,
 * lyric, persistence and media-session state. Render an `<audio>`
 * element with `audioProps` to bind it. This is a thin orchestrator
 * composing the focused hooks in this directory; shared mutable state
 * is passed to them explicitly via {@link PlayerContext}.
 */
export function useMusicPlayer(
  options: UseMusicPlayerOptions,
): UseMusicPlayerResult {
  const {
    audioLists,
    playIndex: playIndexProp,
    defaultPlayIndex,
    playMode: playModeProp,
    defaultPlayMode,
    onPlayModeChange,
    theme: themeProp,
    defaultTheme,
    onThemeChange,
    mode: modeProp,
    defaultMode,
    onModeChange,
    volume: volumeProp,
    defaultVolume,
    onVolumeChange,
    autoPlay = true,
    preload = 'none',
    preserveCurrentOnUpdate = false,
    replaceListOnUpdate = false,
    autoPlayOnListUpdate = false,
    persist = false,
    mobileMediaQuery = MEDIA_QUERY.MOBILE,
    mediaSession = false,
  } = options

  // ---- controllable props ----
  const [playMode, setPlayModeState] = useControllableState<PlayMode>({
    value: playModeProp,
    defaultValue: defaultPlayMode ?? 'order',
    onChange: onPlayModeChange,
  })
  const [theme, setThemeState] = useControllableState<Theme>({
    value: themeProp,
    defaultValue: defaultTheme ?? 'dark',
    onChange: onThemeChange,
  })
  const [mode, setModeState] = useControllableState<PlayerMode>({
    value: modeProp,
    defaultValue: defaultMode ?? 'full',
    onChange: onModeChange,
  })
  const [volume, setVolumeState] = useControllableState<number>({
    value: volumeProp,
    defaultValue: defaultVolume ?? DEFAULT_VOLUME,
    onChange: onVolumeChange,
  })

  // ---- reducer state ----
  const [state, dispatch] = useReducer(reducer, {
    tracks: withIds(audioLists),
    index: clampIndex(
      playIndexProp ?? defaultPlayIndex ?? 0,
      audioLists.length,
    ),
    src: null,
    status: audioLists.length > 0 ? 'loading' : 'idle',
    error: null,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    muted: false,
    fading: null,
    lyricIndex: -1,
    playbackRate: 1,
    selectGen: 0,
  })

  const index =
    playIndexProp !== undefined
      ? clampIndex(playIndexProp, state.tracks.length)
      : state.index
  const track = index >= 0 ? (state.tracks[index] ?? null) : null

  // ---- shared refs, latest mirror, context ----
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingPlayRef = useRef(autoPlay && index >= 0)
  const playingRef = useRef(false)

  const latest = useRef<PlayerLatest>({
    options,
    state,
    index,
    track,
    playMode,
    volume,
    theme,
  })
  useEffect(() => {
    latest.current = { options, state, index, track, playMode, volume, theme }
  })

  const patch = useCallback((p: Partial<InternalState>) => {
    dispatch({ type: 'patch', patch: p })
  }, [])

  const getAudioInfo = useCallback((): AudioInfo => {
    const l = latest.current
    const audio = audioRef.current
    const t = l.index >= 0 ? (l.state.tracks[l.index] ?? null) : null
    const lines = t?.lyric ? parseLrc(t.lyric).lines : []
    const currentLyric =
      l.state.lyricIndex >= 0 ? (lines[l.state.lyricIndex]?.text ?? null) : null
    return {
      track: t,
      index: l.index,
      tracks: l.state.tracks,
      currentTime: audio?.currentTime ?? l.state.currentTime,
      duration: audio?.duration ?? l.state.duration,
      volume: l.volume,
      muted: audio?.muted ?? l.state.muted,
      paused: audio?.paused ?? true,
      ended: audio?.ended ?? false,
      readyState: audio?.readyState ?? 0,
      networkState: audio?.networkState ?? 0,
      playMode: l.playMode,
      currentLyric,
    }
  }, [])

  const getLatest = useCallback(() => latest.current, [])
  const ctx: PlayerContext = useMemo(
    () => ({
      getLatest,
      audioRef,
      pendingPlayRef,
      playingRef,
      patch,
      getAudioInfo,
    }),
    [getLatest, patch, getAudioInfo],
  )

  // ---- seek primitives (audio-source's `prev` restarts via these) ----
  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current
      if (!audio) return
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      audio.currentTime = Math.min(Math.max(seconds, 0), duration || seconds)
      patch({ currentTime: audio.currentTime })
    },
    [patch],
  )
  const seekBy = useCallback(
    (seconds: number) => {
      const audio = audioRef.current
      if (audio) seek(audio.currentTime + seconds)
    },
    [seek],
  )

  // ---- composed hooks ----
  const fades = useVolumeFade(ctx, volume)
  const selectKey = `${index}:${track?.id ?? ''}:${state.selectGen}`
  const source = useAudioSource(ctx, {
    cancelFade: fades.cancelFade,
    seek,
    selectKey,
    src: state.src,
  })
  const persisted = usePersistedState(ctx, {
    persist,
    restorePlayMode:
      playModeProp === undefined && defaultPlayMode === undefined,
    restoreTheme: themeProp === undefined && defaultTheme === undefined,
    restoreVolume: volumeProp === undefined && defaultVolume === undefined,
    setPlayMode: setPlayModeState,
    setTheme: setThemeState,
    setVolume: setVolumeState,
    selectIndex: source.selectIndex,
    autoPlay,
  })
  const lyric = useLyricSync(ctx, track)
  const playlist = usePlaylistSync(ctx, {
    audioLists,
    replaceListOnUpdate,
    preserveCurrentOnUpdate,
    autoPlayOnListUpdate,
    selectIndex: source.selectIndex,
    cancelFade: fades.cancelFade,
    persistClear: persisted.clear,
  })
  const download = useDownload(ctx)
  const events = usePlaybackEvents(ctx, { fades, source, lyric, persisted })
  const bindAudio = useAudioEvents(
    audioRef,
    events,
    () => latest.current.state.muted,
  )

  const resolvedTheme = useResolvedTheme(theme)
  const isMobile = useMediaQuery(mobileMediaQuery ?? null)

  const smallActions = usePlayerActions(ctx, {
    fades,
    persistNow: persisted.persistNow,
    resolvedTheme,
    mode,
    setVolumeState,
    setPlayModeState,
    setThemeState,
    setModeState,
  })

  // muted -> element
  const muted = state.muted
  useEffect(() => {
    const audio = audioRef.current
    if (audio && audio.muted !== muted) audio.muted = muted
  }, [muted])

  // unmount cleanup (each composed hook releases its own resources first)
  useEffect(
    () => () => {
      audioRef.current?.pause()
    },
    [],
  )

  const positionSnapshot = useMemo(
    () => ({
      duration: state.duration,
      position: state.currentTime,
      playbackRate: state.playbackRate,
    }),
    [state.duration, state.currentTime, state.playbackRate],
  )
  useMediaSession({
    enabled: mediaSession,
    track,
    position: positionSnapshot,
    actions: {
      play: () => void fades.playImpl(),
      pause: fades.pauseImpl,
      next: source.next,
      prev: source.prev,
      seek,
      seekBy,
    },
    audioRef,
  })

  // ---- public surface ----
  const actions: MusicPlayerActions = useMemo(
    () => ({
      play: fades.playImpl,
      pause: fades.pauseImpl,
      togglePlay: fades.togglePlay,
      playIndex: source.playIndex,
      playId: source.playId,
      next: source.next,
      prev: source.prev,
      reload: source.reload,
      seek,
      seekBy,
      ...smallActions,
      removeTrack: playlist.removeTrack,
      clearTracks: playlist.clearTracks,
      reorderTracks: playlist.reorderTracks,
      download,
      getAudioInfo,
    }),
    [
      fades,
      source,
      playlist,
      seek,
      seekBy,
      smallActions,
      download,
      getAudioInfo,
    ],
  )

  const src = state.src
  const audioProps: MusicPlayerAudioProps = useMemo(
    () => ({
      ref: bindAudio,
      src: src ?? undefined,
      preload,
      crossOrigin: options.crossOrigin,
    }),
    [bindAudio, src, preload, options.crossOrigin],
  )

  const stateOut: MusicPlayerState = {
    tracks: state.tracks,
    index,
    track,
    src,
    status: state.status,
    error: state.error,
    currentTime: state.currentTime,
    duration: state.duration,
    buffered: state.buffered,
    volume,
    muted: state.muted,
    fading: state.fading,
    playMode,
    theme,
    resolvedTheme,
    mode,
    isMobile,
    lyricLines: lyric.lines,
    lyricIndex: state.lyricIndex,
    currentLyric:
      state.lyricIndex >= 0
        ? (lyric.lines[state.lyricIndex]?.text ?? null)
        : null,
  }

  return {
    state: stateOut,
    actions,
    audioRef: audioRef as RefObject<HTMLAudioElement | null>,
    audioProps,
  }
}
