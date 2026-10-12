import { TailwindReactMusicPlayerPlayMode } from '../types'

const PLAY_MODE: Record<
  TailwindReactMusicPlayerPlayMode,
  TailwindReactMusicPlayerPlayMode
> = {
  order: 'order',
  orderLoop: 'orderLoop',
  singleLoop: 'singleLoop',
  shufflePlay: 'shufflePlay',
}

export default PLAY_MODE
