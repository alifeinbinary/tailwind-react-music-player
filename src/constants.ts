/** Ordered list of supported play modes. */
export const PLAY_MODES = [
  'order',
  'orderLoop',
  'singleLoop',
  'shufflePlay',
] as const

/** Supported player themes. */
export const THEMES = ['dark', 'light', 'auto'] as const

/** Supported player layout modes. */
export const PLAYER_MODES = ['mini', 'full'] as const

/** Media queries used by the player. */
export const MEDIA_QUERY = {
  MOBILE: '(max-width: 768px) and (orientation: portrait)',
  DARK_SCHEME: '(prefers-color-scheme: dark)',
} as const

/** HTMLMediaElement `networkState` values. */
export const AUDIO_NETWORK_STATE = {
  EMPTY: 0,
  IDLE: 1,
  LOADING: 2,
  NO_SOURCE: 3,
} as const

/** HTMLMediaElement `readyState` values. */
export const AUDIO_READY_STATE = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
} as const

/** Durations, delays and thresholds shared across the player. */
export const TIMING = {
  REMOVE_ANIMATION_MS: 350,
  SEEK_SETTLE_MS: 500,
  PLAY_MODE_TIP_MS: 600,
  PERSIST_THROTTLE_MS: 1000,
  RESTART_ON_PREV_THRESHOLD_S: 1,
} as const

/** Namespaced localStorage key for the persisted player state. */
export const PERSIST_KEY = 'trmp:player'

/** Default seek step for the media-session seek actions. */
export const DEFAULT_SKIP_SECONDS = 10

/** Default output volume (0..1). */
export const DEFAULT_VOLUME = 1
