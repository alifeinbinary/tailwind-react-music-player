import type { ReactNode } from 'react'
import {
  CloseIcon,
  CollapseIcon,
  ControllerIcon,
  DeleteIcon,
  DestroyIcon,
  DownloadIcon,
  EmptyIcon,
  LoadingIcon,
  LyricIcon,
  MinimizeIcon,
  MuteIcon,
  NextIcon,
  OrderIcon,
  OrderLoopIcon,
  PauseIcon,
  PlaylistIcon,
  PlayIcon,
  PrevIcon,
  ReloadIcon,
  ShuffleIcon,
  SingleLoopIcon,
  VolumeIcon,
} from './icons'

export * from './icons'

/** Keys of the player's default icon set. */
export type IconKey = keyof PlayerIcons

/** Maps each semantic player slot to a rendered icon node. */
export interface PlayerIcons {
  play: ReactNode
  pause: ReactNode
  prev: ReactNode
  next: ReactNode
  loading: ReactNode
  volume: ReactNode
  mute: ReactNode
  download: ReactNode
  reload: ReactNode
  lyric: ReactNode
  playlist: ReactNode
  close: ReactNode
  delete: ReactNode
  minimize: ReactNode
  destroy: ReactNode
  order: ReactNode
  orderLoop: ReactNode
  singleLoop: ReactNode
  shuffle: ReactNode
  collapse: ReactNode
  empty: ReactNode
  controller: ReactNode
}

/** Default Lucide-derived icon set. */
export const defaultIcons: PlayerIcons = {
  play: <PlayIcon />,
  pause: <PauseIcon />,
  prev: <PrevIcon />,
  next: <NextIcon />,
  loading: <LoadingIcon />,
  volume: <VolumeIcon />,
  mute: <MuteIcon />,
  download: <DownloadIcon />,
  reload: <ReloadIcon />,
  lyric: <LyricIcon />,
  playlist: <PlaylistIcon />,
  close: <CloseIcon />,
  delete: <DeleteIcon />,
  minimize: <MinimizeIcon />,
  destroy: <DestroyIcon />,
  order: <OrderIcon />,
  orderLoop: <OrderLoopIcon />,
  singleLoop: <SingleLoopIcon />,
  shuffle: <ShuffleIcon />,
  collapse: <CollapseIcon />,
  empty: <EmptyIcon />,
  controller: <ControllerIcon />,
}
