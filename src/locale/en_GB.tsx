import { FaHeadphonesIcon } from '../components/Icon'
import { type TailwindReactMusicPlayerCustomLocale } from '../types'

const en_GB: TailwindReactMusicPlayerCustomLocale = {
  playModeText: {
    order: 'Play in order',
    orderLoop: 'List loop',
    singleLoop: 'Single loop',
    shufflePlay: 'Shuffle playback',
  },
  openText: 'Open',
  closeText: 'Close',
  emptyText: 'No music',
  clickToPlayText: 'Click to play',
  clickToPauseText: 'Click to pause',
  nextTrackText: 'Next track',
  previousTrackText: 'Previous track',
  reloadText: 'Reload',
  volumeText: 'Volume',
  playListsText: 'Playlists',
  toggleLyricText: 'Toggle lyric',
  toggleMiniModeText: 'Minimise',
  destroyText: 'Destroy',
  downloadText: 'Download',
  lightThemeText: 'L',
  darkThemeText: 'D',
  switchThemeText: 'Dark/Light mode',
  removeAudioListsText: 'Delete audio lists',
  clickToDeleteText: (name) => `Click to delete ${name}`,
  controllerTitle: <FaHeadphonesIcon />,
  emptyLyricText: 'No lyrics',
  loadingText: 'Loading',
}

export default en_GB
