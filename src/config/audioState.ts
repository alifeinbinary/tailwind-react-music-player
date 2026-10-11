export const AUDIO_NETWORK_STATE = {
  NETWORK_EMPTY: 0, // Represents an uninitialized network state value in audio network state.
  NETWORK_IDLE: 1, // Represents an idle network state value in audio network state (e.g., 304 cache).
  NETWORK_LOADING: 2, // Represents a loading network state value in audio network state.
  NETWORK_NO_SOURCE: 3, // Represents a no-source network state value in audio network state.
  NETWORK_READY_SUCCESS_STATE: 4, // Represents a successful network-ready state value in audio network state.
} as const

export const AUDIO_READY_STATE = {
  HAVE_NOTHING: 0, // Indicates no readiness information for audio/video in AUDIO_READY_STATE
  HAVE_METADATA: 1, // Represents the ready-state metadata for audio/video readiness in the audioState config.
  HAVE_CURRENT_DATA: 2, // Indicates current playback data is available, but not enough for the next frame.
  HAVE_FUTURE_DATA: 3, // Indicates future data availability in the audio ready state.
  HAVE_ENOUGH_DATA: 4, // Indicates the READY state where enough data is available to start playback.
} as const
