import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { RefObject } from 'react'
import {
  DEFAULT_VOLUME,
  MEDIA_QUERY,
  PERSIST_KEY,
  PLAY_MODES,
  TIMING,
} from '../constants'
import {
  adjacentIndex,
  clampIndex,
  createFade,
  createLyricScheduler,
  createPersistence,
  downloadFile,
  findIndexById,
  inferFilename,
  nextIndexOnEnded,
  parseLrc,
  removeById,
  reorder,
  sliderToGain,
  throttle,
  withIds,
} from '../core'
import type { FadeHandle } from '../core/volume-fade'
import type { LyricScheduler } from '../core/lyric-parser'
import type { PersistedPlayerState } from '../core/persistence'
import type {
  AudioInfo,
  DownloadInfo,
  MusicPlayerActions,
  MusicPlayerAudioProps,
  MusicPlayerState,
  PlaybackStatus,
  PlayMode,
  PlayerMode,
  PlaylistItem,
  Theme,
  UseMusicPlayerOptions,
  UseMusicPlayerResult,
} from '../types'
import { isIOS } from './platform'
import { useControllableState } from './use-controllable-state'
import { useMediaQuery } from './use-media-query'
import { useMediaSession } from './use-media-session'
import { useResolvedTheme } from './use-system-theme'

interface InternalState {
  tracks: readonly PlaylistItem[]
  index: number
  src: string | null
  status: PlaybackStatus
  error: MediaError | Error | null
  currentTime: number
  duration: number
  buffered: number
  muted: boolean
  fading: 'in' | 'out' | null
  lyricIndex: number
  playbackRate: number
  /** Incremented on every explicit track selection. */
  selectGen: number
}

const reducer = (
  state: InternalState,
  action: { type: 'patch'; patch: Partial<InternalState> },
): InternalState => ({ ...state, ...action.patch })

const isFinitePositive = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0

/**
 * Headless music player hook: owns playlist, playback, volume/mute,
 * lyric, persistence and media-session state. Render an `<audio>`
 * element with `audioProps` to bind it.
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

  // ---- refs ----
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingPlayRef = useRef(autoPlay && index >= 0)
  const generationRef = useRef(0)
  const srcCacheRef = useRef(new Map<string, string>())
  const fadeRef = useRef<FadeHandle | null>(null)
  const restoreTimeRef = useRef<number | null>(null)
  const restoredRef = useRef(false)
  const previousListsRef = useRef(audioLists)
  const unbindRef = useRef<(() => void) | null>(null)
  const lyricSchedulerRef = useRef<LyricScheduler | null>(null)
  /** Synchronous mirror of "is playing" — state commits too late to dedupe the play+playing event pair. */
  const playingRef = useRef(false)

  // latest-values mirror for event handlers bound once
  const latest = useRef({
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

  // ---- lyric ----
  const lyricLines = useMemo(
    () => (track?.lyric ? parseLrc(track.lyric).lines : []),
    [track],
  )

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

  // ---- persistence ----
  const persistence = useMemo(
    () =>
      persist
        ? createPersistence(persist === true ? PERSIST_KEY : persist)
        : null,
    [persist],
  )

  // throttled writer created in an effect (reads refs, so it cannot be
  // built during render)
  const writePersistedRef = useRef<
    (() => void) & { flush(): void; cancel(): void }
  >(null)
  useEffect(() => {
    if (!persistence) {
      writePersistedRef.current = null
      return undefined
    }
    const writer = throttle(() => {
      const l = latest.current
      const t = l.index >= 0 ? (l.state.tracks[l.index] ?? null) : null
      const audio = audioRef.current
      const stateToWrite: PersistedPlayerState = {
        version: 1,
        trackId: t?.id ?? null,
        musicSrc: l.state.src,
        currentTime: audio?.currentTime ?? l.state.currentTime,
        volume: l.volume,
        muted: audio?.muted ?? l.state.muted,
        playMode: l.playMode,
        theme: l.theme,
        playing: l.state.status === 'playing',
      }
      persistence.write(stateToWrite)
    }, TIMING.PERSIST_THROTTLE_MS)
    writePersistedRef.current = writer
    return () => writer.cancel()
  }, [persistence])

  // deferred one macrotask so the throttled write reads committed state
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)
  const persistNow = useCallback(() => {
    const writePersisted = writePersistedRef.current
    if (
      unmountedRef.current ||
      !writePersisted ||
      persistTimerRef.current !== null
    ) {
      return
    }
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null
      writePersisted()
    }, 0)
  }, [])

  // ---- fades ----
  const cancelFade = useCallback(
    (restoreGain: boolean) => {
      const fade = fadeRef.current
      fadeRef.current = null
      if (fade) {
        fade.cancel()
        const audio = audioRef.current
        if (restoreGain && audio && !isIOS()) {
          audio.volume = sliderToGain(latest.current.volume)
        }
      }
      patch({ fading: null })
    },
    [patch],
  )

  const startFade = useCallback(
    (
      direction: 'in' | 'out',
      targetGain: number,
      durationMs: number,
      onDone?: () => void,
    ): boolean => {
      const audio = audioRef.current
      if (!audio || isIOS() || durationMs <= 0) return false
      fadeRef.current?.cancel()
      const from = audio.volume
      patch({ fading: direction })
      const fade = createFade(
        (gain) => {
          const el = audioRef.current
          if (el) el.volume = gain
        },
        {
          from,
          to: targetGain,
          durationMs,
        },
      )
      fadeRef.current = fade
      void fade.done.then((outcome) => {
        if (fadeRef.current === fade) fadeRef.current = null
        patch({ fading: null })
        if (outcome === 'completed') onDone?.()
      })
      return true
    },
    [patch],
  )

  // ---- track selection ----
  const selectIndex = useCallback(
    (
      nextIndex: number,
      opts: { autoplay?: boolean; notify?: boolean; force?: boolean } = {},
    ) => {
      const l = latest.current
      const clamped =
        nextIndex < 0 ? -1 : clampIndex(nextIndex, l.state.tracks.length)
      if (opts.notify !== false) {
        l.options.onPlayIndexChange?.(clamped)
      }
      if (l.options.playIndex !== undefined && !opts.force) {
        // controlled: the prop owns the selection
        return
      }
      cancelFade(true)
      pendingPlayRef.current = opts.autoplay ?? true
      playingRef.current = false
      generationRef.current += 1
      patch({
        index: clamped,
        src: null,
        status: clamped >= 0 ? 'loading' : 'idle',
        error: null,
        currentTime: 0,
        duration: 0,
        buffered: 0,
        lyricIndex: -1,
        selectGen: l.state.selectGen + 1,
      })
    },
    [patch, cancelFade],
  )

  const skipToNextOnError = useCallback(() => {
    const l = latest.current
    const len = l.state.tracks.length
    if (len === 0 || l.index < 0) return
    if (l.playMode === 'order' && l.index >= len - 1) return
    const next = adjacentIndex(
      'next',
      l.playMode,
      l.index,
      len,
      l.options.random ?? Math.random,
    )
    if (next !== null && next !== l.index) {
      selectIndex(next)
    }
  }, [selectIndex])

  // resolves musicSrc for the current index/track; driven by an effect
  const resolveSrc = useCallback(() => {
    const l = latest.current
    const t = l.track
    const gen = generationRef.current
    if (!t) {
      if (l.state.src !== null) patch({ src: null })
      return
    }
    const finish = (src: string) => {
      if (generationRef.current !== gen) return
      patch({ src })
      l.options.onTrackChange?.(getAudioInfo())
    }
    const fail = (error: unknown) => {
      if (generationRef.current !== gen) return
      const err = error instanceof Error ? error : new Error(String(error))
      patch({ status: 'error', error: err })
      l.options.onError?.(err, getAudioInfo())
      if (l.options.skipOnError ?? true) skipToNextOnError()
    }
    const srcValue = t.musicSrc
    if (typeof srcValue === 'string') {
      finish(srcValue)
      return
    }
    const cached = srcCacheRef.current.get(t.id)
    if (cached !== undefined) {
      finish(cached)
      return
    }
    srcValue().then((src) => {
      srcCacheRef.current.set(t.id, src)
      finish(src)
    }, fail)
  }, [patch, getAudioInfo, skipToNextOnError])

  // drive resolution on selection changes
  const selectKey = `${index}:${track?.id ?? ''}:${state.selectGen}`
  useEffect(() => {
    resolveSrc()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by selection identity, not every render
  }, [selectKey])

  const playImpl = useCallback(async (): Promise<void> => {
    const l = latest.current
    const audio = audioRef.current
    if (l.index < 0 || !l.track) return
    if (!l.state.src || !audio) {
      pendingPlayRef.current = true
      return
    }
    const fadeIn = l.options.volumeFade?.fadeIn ?? 0
    try {
      if (!isIOS() && fadeIn > 0) {
        audio.volume = 0
      }
      await audio.play()
      if (!isIOS() && fadeIn > 0) {
        startFade('in', sliderToGain(l.volume), fadeIn)
      }
    } catch {
      // play() rejected (e.g. no gesture) — settle to paused
      patch({ status: 'paused' })
    }
  }, [startFade, patch])

  const pauseImpl = useCallback((): void => {
    const l = latest.current
    const audio = audioRef.current
    const fadeOut = l.options.volumeFade?.fadeOut ?? 0
    if (audio && !isIOS() && fadeOut > 0 && !audio.paused) {
      const gain = audio.volume
      const finished = startFade('out', 0, fadeOut, () => {
        audio.pause()
        if (!isIOS()) audio.volume = gain
      })
      if (finished) return
    }
    audio?.pause()
  }, [startFade])

  // ---- media element binding ----
  const onPlayEvent = useCallback(() => {
    const l = latest.current
    const wasPlaying = playingRef.current
    playingRef.current = true
    patch({ status: 'playing' })
    lyricSchedulerRef.current?.play((audioRef.current?.currentTime ?? 0) * 1000)
    if (!wasPlaying) {
      l.options.onPlay?.(getAudioInfo())
      persistNow()
    }
  }, [patch, getAudioInfo, persistNow])

  const onPauseEvent = useCallback(() => {
    const l = latest.current
    const audio = audioRef.current
    playingRef.current = false
    if (!audio?.ended) {
      patch({ status: 'paused' })
    }
    l.options.onPause?.(getAudioInfo())
    lyricSchedulerRef.current?.pause()
    persistNow()
  }, [patch, getAudioInfo, persistNow])

  const onEndedEvent = useCallback(() => {
    const l = latest.current
    lyricSchedulerRef.current?.stop()
    playingRef.current = false
    l.options.onEnded?.(getAudioInfo())
    const next = nextIndexOnEnded(
      l.playMode,
      l.index,
      l.state.tracks.length,
      l.options.random ?? Math.random,
    )
    if (next === null) {
      patch({ status: 'paused' })
    } else if (next === l.index) {
      const audio = audioRef.current
      if (audio) audio.currentTime = 0
      pendingPlayRef.current = true
      void audio?.play().catch(() => {})
    } else {
      selectIndex(next)
    }
    persistNow()
  }, [patch, getAudioInfo, persistNow, selectIndex])

  const onErrorEvent = useCallback(() => {
    const l = latest.current
    const audioError = audioRef.current?.error ?? null
    patch({ status: 'error', error: audioError })
    l.options.onError?.(audioError, getAudioInfo())
    if (l.options.skipOnError ?? true) skipToNextOnError()
    persistNow()
  }, [patch, getAudioInfo, persistNow, skipToNextOnError])

  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    patch({ currentTime: audio.currentTime })
    latest.current.options.onProgress?.(getAudioInfo())
    persistNow()
  }, [patch, getAudioInfo, persistNow])

  const onProgressEvent = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    try {
      const buffered = audio.buffered
      if (buffered.length > 0 && audio.duration > 0) {
        patch({ buffered: buffered.end(buffered.length - 1) / audio.duration })
      }
    } catch {
      // some implementations throw on empty ranges — ignore
    }
  }, [patch])

  const onSeekedEvent = useCallback(() => {
    const audio = audioRef.current
    if (audio) patch({ currentTime: audio.currentTime })
    latest.current.options.onSeeked?.(getAudioInfo())
    if (audio) lyricSchedulerRef.current?.seek(audio.currentTime * 1000)
  }, [patch, getAudioInfo])

  const onVolumeChangeEvent = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    // mirror muted only; the slider is state-driven, fades own the gain
    if (audio.muted !== latest.current.state.muted) {
      patch({ muted: audio.muted })
      persistNow()
    }
  }, [patch, persistNow])

  const onLoadedMetadata = useCallback(() => {
    const l = latest.current
    const audio = audioRef.current
    if (!audio) return
    const trackDuration = l.track?.duration
    patch({
      duration:
        isFinitePositive(trackDuration) && trackDuration > 0
          ? trackDuration
          : audio.duration,
    })
  }, [patch])

  const onCanPlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (restoreTimeRef.current !== null) {
      audio.currentTime = restoreTimeRef.current
      restoreTimeRef.current = null
    }
    if (pendingPlayRef.current) {
      pendingPlayRef.current = false
      void playImpl()
    } else {
      patch({ status: 'paused' })
    }
  }, [patch, playImpl])

  const onAbortEvent = useCallback(() => {
    latest.current.options.onAbort?.(getAudioInfo())
  }, [getAudioInfo])

  const onRateChange = useCallback(() => {
    const audio = audioRef.current
    if (audio) patch({ playbackRate: audio.playbackRate })
  }, [patch])

  // bind listeners via the ref callback so they attach with the element
  const bindAudio = useCallback(
    (el: HTMLAudioElement | null) => {
      unbindRef.current?.()
      unbindRef.current = null
      audioRef.current = el
      if (!el) return
      const listeners: [string, () => void][] = [
        ['loadedmetadata', onLoadedMetadata],
        ['durationchange', onLoadedMetadata],
        ['canplay', onCanPlay],
        ['play', onPlayEvent],
        ['playing', onPlayEvent],
        ['pause', onPauseEvent],
        ['timeupdate', onTimeUpdate],
        ['progress', onProgressEvent],
        ['ended', onEndedEvent],
        ['error', onErrorEvent],
        ['seeked', onSeekedEvent],
        ['volumechange', onVolumeChangeEvent],
        ['abort', onAbortEvent],
        ['ratechange', onRateChange],
      ]
      for (const [type, handler] of listeners) {
        el.addEventListener(type, handler)
      }
      el.muted = latest.current.state.muted
      unbindRef.current = () => {
        for (const [type, handler] of listeners) {
          el.removeEventListener(type, handler)
        }
      }
    },
    [
      onLoadedMetadata,
      onCanPlay,
      onPlayEvent,
      onPauseEvent,
      onTimeUpdate,
      onProgressEvent,
      onEndedEvent,
      onErrorEvent,
      onSeekedEvent,
      onVolumeChangeEvent,
      onAbortEvent,
      onRateChange,
    ],
  )

  // load() when src changes
  const src = state.src
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (src === null) {
      audio.removeAttribute('src')
      return
    }
    audio.src = src
    audio.load()
  }, [src])

  // volume -> gain (slider owns it unless a fade is in-flight)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isIOS()) return
    const fade = fadeRef.current
    if (fade?.active && latest.current.state.fading === 'in') {
      fade.retarget(sliderToGain(volume))
      return
    }
    audio.volume = sliderToGain(volume)
  }, [volume])

  // muted -> element
  const muted = state.muted
  useEffect(() => {
    const audio = audioRef.current
    if (audio && audio.muted !== muted) audio.muted = muted
  }, [muted])

  // ---- mount restore (persisted state) ----
  useEffect(() => {
    if (!persistence || restoredRef.current) return
    restoredRef.current = true
    const saved = persistence.read()
    if (!saved) return
    const l = latest.current
    if (playModeProp === undefined && defaultPlayMode === undefined) {
      setPlayModeState(saved.playMode)
    }
    if (themeProp === undefined && defaultTheme === undefined) {
      setThemeState(saved.theme)
    }
    if (volumeProp === undefined && defaultVolume === undefined) {
      setVolumeState(saved.volume)
    }
    if (saved.muted) patch({ muted: true })
    restoreTimeRef.current = saved.currentTime
    const byId = saved.trackId
      ? findIndexById(l.state.tracks, saved.trackId)
      : -1
    const bySrc =
      byId === -1 && saved.musicSrc
        ? l.state.tracks.findIndex((t) => t.musicSrc === saved.musicSrc)
        : byId
    if (bySrc >= 0 && bySrc !== l.index) {
      selectIndex(bySrc, { autoplay: autoPlay })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only restore
  }, [])

  // ---- audioLists prop changes (reference inequality) ----
  useEffect(() => {
    if (previousListsRef.current === audioLists) return
    previousListsRef.current = audioLists
    const l = latest.current
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
    audioLists,
    replaceListOnUpdate,
    preserveCurrentOnUpdate,
    autoPlayOnListUpdate,
    patch,
    selectIndex,
    getAudioInfo,
  ])

  // ---- lyric scheduler ----
  useEffect(() => {
    const scheduler = createLyricScheduler(lyricLines, (line, i) => {
      patch({ lyricIndex: i })
      latest.current.options.onLyricChange?.(line.text, i)
    })
    lyricSchedulerRef.current = scheduler
    return () => {
      scheduler.stop()
      if (lyricSchedulerRef.current === scheduler) {
        lyricSchedulerRef.current = null
      }
    }
  }, [lyricLines, patch])

  // ---- media session / mobile ----
  const isMobile = useMediaQuery(mobileMediaQuery ?? null)
  const resolvedTheme = useResolvedTheme(theme)

  const positionSnapshot = useMemo(
    () => ({
      duration: state.duration,
      position: state.currentTime,
      playbackRate: state.playbackRate,
    }),
    [state.duration, state.currentTime, state.playbackRate],
  )

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0
    audio.currentTime = Math.min(Math.max(seconds, 0), duration || seconds)
    // fake-media dispatches seeked synchronously; state mirrors it
    dispatch({ type: 'patch', patch: { currentTime: audio.currentTime } })
  }, [])

  const seekBy = useCallback(
    (seconds: number) => {
      const audio = audioRef.current
      if (!audio) return
      seek(audio.currentTime + seconds)
    },
    [seek],
  )

  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.min(Math.max(v, 0), 1)
      setVolumeState(clamped)
      const audio = audioRef.current
      const fade = fadeRef.current
      if (fade?.active && latest.current.state.fading === 'in') {
        fade.retarget(sliderToGain(clamped))
      } else if (audio && !isIOS()) {
        audio.volume = sliderToGain(clamped)
      }
      if (clamped > 0 && audio?.muted) {
        audio.muted = false
      }
      persistNow()
    },
    [setVolumeState, persistNow],
  )

  const volumeBy = useCallback(
    (delta: number) => {
      setVolume(latest.current.volume + delta)
    },
    [setVolume],
  )

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    const next = !(audio?.muted ?? latest.current.state.muted)
    if (audio) audio.muted = next
    patch({ muted: next })
    persistNow()
  }, [patch, persistNow])

  const next = useCallback(() => {
    const l = latest.current
    const nextIndex = adjacentIndex(
      'next',
      l.playMode,
      l.index,
      l.state.tracks.length,
      l.options.random ?? Math.random,
    )
    if (nextIndex !== null) selectIndex(nextIndex)
  }, [selectIndex])

  const prev = useCallback(() => {
    const l = latest.current
    const audio = audioRef.current
    if (
      (l.options.restartCurrentOnPrev ?? false) &&
      (audio?.currentTime ?? 0) > TIMING.RESTART_ON_PREV_THRESHOLD_S
    ) {
      seek(0)
      return
    }
    const prevIndex = adjacentIndex(
      'prev',
      l.playMode,
      l.index,
      l.state.tracks.length,
      l.options.random ?? Math.random,
    )
    if (prevIndex !== null) selectIndex(prevIndex)
  }, [selectIndex, seek])

  const reload = useCallback(() => {
    const l = latest.current
    const t = l.track
    if (t) srcCacheRef.current.delete(t.id)
    l.options.onReload?.(getAudioInfo())
    selectIndex(l.index, { notify: false, force: true })
  }, [selectIndex, getAudioInfo])

  const playIndexAction = useCallback(
    (i: number) => {
      selectIndex(i)
    },
    [selectIndex],
  )

  const playId = useCallback(
    (id: string) => {
      const i = findIndexById(latest.current.state.tracks, id)
      if (i >= 0) selectIndex(i)
    },
    [selectIndex],
  )

  const togglePlay = useCallback(() => {
    const l = latest.current
    const audio = audioRef.current
    // reverse an in-flight fade instead of starting over
    if (l.state.fading === 'in') {
      pauseImpl()
      return
    }
    if (l.state.fading === 'out') {
      void playImpl()
      return
    }
    if (audio?.paused === false) {
      pauseImpl()
    } else {
      void playImpl()
    }
  }, [playImpl, pauseImpl])

  const setPlayMode = useCallback(
    (m: PlayMode) => {
      setPlayModeState(m)
      persistNow()
    },
    [setPlayModeState, persistNow],
  )

  const cyclePlayMode = useCallback(() => {
    const l = latest.current
    const i = PLAY_MODES.indexOf(l.playMode)
    setPlayMode(PLAY_MODES[(i + 1) % PLAY_MODES.length])
  }, [setPlayMode])

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t)
      persistNow()
    },
    [setThemeState, persistNow],
  )

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [setTheme, resolvedTheme])

  const setMode = useCallback(
    (m: PlayerMode) => {
      setModeState(m)
    },
    [setModeState],
  )

  const toggleMode = useCallback(() => {
    setMode(mode === 'mini' ? 'full' : 'mini')
  }, [setMode, mode])

  const removeTrack = useCallback(
    (id: string) => {
      const l = latest.current
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
    [patch, selectIndex, cancelFade, getAudioInfo],
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
    persistence?.clear()
    latest.current.options.onTracksChange?.([], getAudioInfo())
  }, [patch, cancelFade, persistence, getAudioInfo])

  const reorderTracks = useCallback(
    (from: number, to: number) => {
      const l = latest.current
      const reordered = reorder(l.state.tracks, from, to)
      if (reordered === l.state.tracks) return
      const currentTrack = l.index >= 0 ? l.state.tracks[l.index] : undefined
      const nextIndex = currentTrack
        ? reordered.findIndex((t) => t.id === currentTrack.id)
        : -1
      patch({ tracks: reordered, index: nextIndex })
      l.options.onTracksChange?.(reordered, getAudioInfo())
    },
    [patch, getAudioInfo],
  )

  const download = useCallback(async (): Promise<void> => {
    const l = latest.current
    const info = getAudioInfo()
    const currentSrc = l.state.src
    if (!currentSrc) return
    const before = await l.options.onBeforeDownload?.(info)
    const request: DownloadInfo = before ?? {
      src: currentSrc,
      filename: inferFilename(currentSrc),
    }
    if (!request.src) request.src = currentSrc
    if (l.options.customDownloader) {
      l.options.customDownloader(request)
    } else {
      downloadFile(request)
    }
    l.options.onDownload?.(info, request)
  }, [getAudioInfo])

  // unmount cleanup
  useEffect(
    () => () => {
      unmountedRef.current = true
      fadeRef.current?.cancel()
      lyricSchedulerRef.current?.stop()
      if (persistTimerRef.current !== null) {
        clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }
      writePersistedRef.current?.flush()
      unbindRef.current?.()
      audioRef.current?.pause()
    },
    [],
  )

  // ---- actions object ----
  const actions: MusicPlayerActions = useMemo(
    () => ({
      play: playImpl,
      pause: pauseImpl,
      togglePlay,
      playIndex: playIndexAction,
      playId,
      next,
      prev,
      reload,
      seek,
      seekBy,
      setVolume,
      volumeBy,
      toggleMute,
      setPlayMode,
      cyclePlayMode,
      setTheme,
      toggleTheme,
      setMode,
      toggleMode,
      removeTrack,
      clearTracks,
      reorderTracks,
      download,
      getAudioInfo,
    }),
    [
      playImpl,
      pauseImpl,
      togglePlay,
      playIndexAction,
      playId,
      next,
      prev,
      reload,
      seek,
      seekBy,
      setVolume,
      volumeBy,
      toggleMute,
      setPlayMode,
      cyclePlayMode,
      setTheme,
      toggleTheme,
      setMode,
      toggleMode,
      removeTrack,
      clearTracks,
      reorderTracks,
      download,
      getAudioInfo,
    ],
  )

  useMediaSession({
    enabled: mediaSession,
    track,
    position: positionSnapshot,
    actions: {
      play: () => void playImpl(),
      pause: pauseImpl,
      next,
      prev,
      seek,
      seekBy,
    },
    audioRef,
  })

  const audioProps: MusicPlayerAudioProps = useMemo(
    () => ({
      ref: bindAudio,
      src: src ?? undefined,
      preload,
      crossOrigin: 'anonymous',
    }),
    [bindAudio, src, preload],
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
    lyricLines,
    lyricIndex: state.lyricIndex,
    currentLyric:
      state.lyricIndex >= 0
        ? (lyricLines[state.lyricIndex]?.text ?? null)
        : null,
  }

  return {
    state: stateOut,
    actions,
    audioRef: audioRef as RefObject<HTMLAudioElement | null>,
    audioProps,
  }
}
