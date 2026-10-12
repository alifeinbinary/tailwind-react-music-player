const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
}

/** Guesses an image MIME type from a URL's file extension. */
export function guessImageMime(url: string): string | undefined {
  const match = url.split(/[?#]/, 1)[0].match(/\.([a-zA-Z0-9]+)$/)
  if (!match) return undefined
  return MIME_BY_EXT[match[1].toLowerCase()]
}

/** Minimal metadata describing a track for the Media Session API. */
export interface TrackMetadata {
  title: string
  artist?: string
  album?: string
  /** Cover image URL. */
  artwork?: string
}

/**
 * Builds a {@link MediaMetadataInit}; the artwork list contains at most
 * one honest entry (no duplicated `sizes` variants).
 */
export function buildMediaMetadata(meta: TrackMetadata): MediaMetadataInit {
  const init: MediaMetadataInit = {
    title: meta.title,
    artist: meta.artist ?? '',
    album: meta.album ?? '',
  }
  if (meta.artwork) {
    const type = guessImageMime(meta.artwork)
    init.artwork = [{ src: meta.artwork, ...(type ? { type } : {}) }]
  }
  return init
}

/**
 * Sets `session.metadata` from `meta`; `null` clears it.
 * No-op where `MediaMetadata` is undefined (non-supporting browsers/SSR).
 */
export function applyMetadata(
  session: MediaSession,
  meta: TrackMetadata | null,
): void {
  if (typeof MediaMetadata === 'undefined') return
  session.metadata = meta ? new MediaMetadata(buildMediaMetadata(meta)) : null
}

/**
 * Publishes playback position to the lock-screen scrubber. Sanitises
 * non-finite values, clamps `position` into `[0, duration]` and swallows
 * the `TypeError` thrown for still-invalid states.
 */
export function applyPositionState(
  session: MediaSession,
  state: { duration: number; position: number; playbackRate?: number },
): void {
  if (typeof session.setPositionState !== 'function') return
  const duration = Number.isFinite(state.duration) ? state.duration : 0
  const position = Number.isFinite(state.position)
    ? Math.min(Math.max(state.position, 0), Math.max(duration, 0))
    : 0
  const playbackRate = Number.isFinite(state.playbackRate)
    ? (state.playbackRate as number)
    : 1
  try {
    session.setPositionState({ duration, position, playbackRate })
  } catch {
    // invalid state rejected by the UA — ignore
  }
}

/** Media-session action handlers keyed by action name. */
export type MediaSessionHandlers = Partial<
  Record<
    | 'play'
    | 'pause'
    | 'stop'
    | 'previoustrack'
    | 'nexttrack'
    | 'seekbackward'
    | 'seekforward'
    | 'seekto',
    MediaSessionActionHandler
  >
>

/**
 * Assigns each handler via `setActionHandler` (unsupported actions are
 * skipped individually). Returns a function that unbinds them all.
 */
export function bindActionHandlers(
  session: MediaSession,
  handlers: MediaSessionHandlers,
): () => void {
  const actions = Object.keys(handlers) as (keyof MediaSessionHandlers)[]
  const bound: (keyof MediaSessionHandlers)[] = []
  for (const action of actions) {
    try {
      session.setActionHandler(action, handlers[action] ?? null)
      bound.push(action)
    } catch {
      // action unsupported by this UA — skip
    }
  }
  return () => {
    for (const action of bound) {
      try {
        session.setActionHandler(action, null)
      } catch {
        // ignore
      }
    }
  }
}
