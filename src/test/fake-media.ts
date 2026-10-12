/**
 * Deterministic `<audio>` fake for hook tests. Patches
 * `HTMLMediaElement.prototype` so elements emit real media events without
 * touching the network.
 */

export interface FakeMediaOptions {
  /** Duration reported by `loadedmetadata`/`durationchange` (default 180). */
  duration?: number
  /** `load()` fails with a MEDIA_ELEMENT_SRC_NOT_SUPPORTED-shaped error for matching srcs. */
  failPattern?: RegExp
  /** When true (default) `load()` schedules metadata/canplay on a microtask. */
  autoCanPlay?: boolean
  /** When true, `play()` before `readyState >= 3` rejects with a DOMException. */
  rejectPlay?: boolean
}

interface ElState {
  src: string
  duration: number
  currentTime: number
  paused: boolean
  readyState: number
  networkState: number
  bufferedEnd: number
  volume: number
  muted: boolean
  playbackRate: number
  error: { code: number } | null
}

export interface FakeMediaController {
  restore(): void
  /** Dispatches a media event on `audio`. */
  emit(audio: HTMLAudioElement, type: string, init?: EventInit): void
  /** Advances `currentTime` and dispatches `timeupdate`. */
  advance(audio: HTMLAudioElement, seconds: number): void
  /** Jumps to the end and dispatches `ended`. */
  end(audio: HTMLAudioElement): void
  /** Sets the buffered end as a fraction of duration. */
  setBuffered(audio: HTMLAudioElement, fraction: number): void
}

const stateMap = new WeakMap<HTMLMediaElement, ElState>()

const stateOf = (
  el: HTMLMediaElement,
  options: Required<Omit<FakeMediaOptions, 'failPattern' | 'rejectPlay'>> &
    Pick<FakeMediaOptions, 'failPattern' | 'rejectPlay'>,
): ElState => {
  let s = stateMap.get(el)
  if (!s) {
    s = {
      src: '',
      duration: options.duration,
      currentTime: 0,
      paused: true,
      readyState: 0,
      networkState: 0,
      bufferedEnd: 0,
      volume: 1,
      muted: false,
      playbackRate: 1,
      error: null,
    }
    stateMap.set(el, s)
  }
  return s
}

const dispatch = (el: HTMLMediaElement, type: string, init?: EventInit) => {
  el.dispatchEvent(new Event(type, { bubbles: false, ...init }))
}

/** Installs the fake media behaviour; returns a controller. */
export function installFakeMedia(
  options: FakeMediaOptions = {},
): FakeMediaController {
  const opts = {
    duration: options.duration ?? 180,
    autoCanPlay: options.autoCanPlay ?? true,
    failPattern: options.failPattern,
    rejectPlay: options.rejectPlay ?? false,
  }
  const proto = HTMLMediaElement.prototype
  const originals = {
    load: proto.load,
    play: proto.play,
    pause: proto.pause,
  }
  const descriptors: [string, PropertyDescriptor][] = []

  const getCurrentSrc = (el: HTMLMediaElement) =>
    el.getAttribute('src') ?? el.src ?? ''

  proto.load = function load(this: HTMLMediaElement) {
    const s = stateOf(this, opts)
    s.src = getCurrentSrc(this)
    s.readyState = 0
    s.networkState = 2 // NETWORK_LOADING
    s.error = null
    dispatch(this, 'loadstart')
    if (opts.autoCanPlay) {
      queueMicrotask(() => {
        const st = stateOf(this, opts)
        if (st.networkState !== 2) return // load() was superseded
        if (opts.failPattern && opts.failPattern.test(st.src)) {
          st.error = { code: 4 } // MEDIA_ELEMENT_SRC_NOT_SUPPORTED
          st.networkState = 3
          st.readyState = 0
          dispatch(this, 'error')
          return
        }
        st.networkState = 1
        st.readyState = 4
        dispatch(this, 'loadedmetadata')
        dispatch(this, 'durationchange')
        dispatch(this, 'canplay')
        dispatch(this, 'canplaythrough')
      })
    }
  }

  proto.play = function play(this: HTMLMediaElement) {
    const s = stateOf(this, opts)
    if (opts.rejectPlay && s.readyState < 3) {
      return Promise.reject(
        new DOMException(
          'The play() request was interrupted',
          'NotAllowedError',
        ),
      )
    }
    s.paused = false
    dispatch(this, 'play')
    dispatch(this, 'playing')
    return Promise.resolve()
  }

  proto.pause = function pause(this: HTMLMediaElement) {
    const s = stateOf(this, opts)
    s.paused = true
    dispatch(this, 'pause')
  }

  const define = (name: string, desc: PropertyDescriptor) => {
    const existing = Object.getOwnPropertyDescriptor(proto, name)
    descriptors.push([name, existing ?? { configurable: true }])
    Object.defineProperty(proto, name, { configurable: true, ...desc })
  }

  define('duration', {
    get(this: HTMLMediaElement) {
      return stateOf(this, opts).duration
    },
  })
  define('currentTime', {
    get(this: HTMLMediaElement) {
      return stateOf(this, opts).currentTime
    },
    set(this: HTMLMediaElement, v: number) {
      const s = stateOf(this, opts)
      dispatch(this, 'seeking')
      s.currentTime = v
      dispatch(this, 'seeked')
    },
  })
  define('paused', {
    get(this: HTMLMediaElement) {
      return stateOf(this, opts).paused
    },
  })
  define('readyState', {
    get(this: HTMLMediaElement) {
      return stateOf(this, opts).readyState
    },
  })
  define('networkState', {
    get(this: HTMLMediaElement) {
      return stateOf(this, opts).networkState
    },
  })
  define('buffered', {
    get(this: HTMLMediaElement) {
      const s = stateOf(this, opts)
      return {
        length: 1,
        start: () => 0,
        end: () => s.bufferedEnd,
      }
    },
  })
  define('volume', {
    get(this: HTMLMediaElement) {
      return stateOf(this, opts).volume
    },
    set(this: HTMLMediaElement, v: number) {
      const s = stateOf(this, opts)
      s.volume = v
      if (v > 0) s.muted = false
      dispatch(this, 'volumechange')
    },
  })
  define('muted', {
    get(this: HTMLMediaElement) {
      return stateOf(this, opts).muted
    },
    set(this: HTMLMediaElement, v: boolean) {
      stateOf(this, opts).muted = v
      dispatch(this, 'volumechange')
    },
  })
  define('error', {
    get(this: HTMLMediaElement) {
      return stateOf(this, opts).error
    },
  })
  define('playbackRate', {
    get(this: HTMLMediaElement) {
      return stateOf(this, opts).playbackRate
    },
    set(this: HTMLMediaElement, v: number) {
      stateOf(this, opts).playbackRate = v
      dispatch(this, 'ratechange')
    },
  })

  return {
    restore() {
      proto.load = originals.load
      proto.play = originals.play
      proto.pause = originals.pause
      for (const [name, desc] of descriptors) {
        Object.defineProperty(proto, name, desc)
      }
    },
    emit(audio, type, init) {
      dispatch(audio, type, init)
    },
    advance(audio, seconds) {
      const s = stateOf(audio, opts)
      s.currentTime += seconds
      dispatch(audio, 'timeupdate')
    },
    end(audio) {
      const s = stateOf(audio, opts)
      s.currentTime = s.duration
      s.paused = true
      dispatch(audio, 'ended')
    },
    setBuffered(audio, fraction) {
      const s = stateOf(audio, opts)
      s.bufferedEnd = s.duration * Math.min(Math.max(fraction, 0), 1)
      dispatch(audio, 'progress')
    },
  }
}
