import { render } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import { createRef } from 'react'
import { MusicPlayer } from '../components/music-player'
import type { AudioTrack, MusicPlayerHandle, MusicPlayerProps } from '../types'

export const TRACKS: AudioTrack[] = [
  {
    name: 'Song One',
    singer: 'Alice',
    musicSrc: 'https://x/1.mp3',
    cover: 'https://x/1.jpg',
    lyric: '[00:01.00]first line\n[00:03.00]second line\n',
  },
  { name: 'Song Two', singer: 'Bob', musicSrc: 'https://x/2.mp3' },
  { name: 'Song Three', singer: 'Carol', musicSrc: 'https://x/3.mp3' },
]

export interface PlayerRender {
  utils: RenderResult
  /** The `.trmp-root` element (inline or inside the portal container). */
  root(): HTMLElement
  audio(): HTMLAudioElement
  handle: React.RefObject<MusicPlayerHandle | null>
}

/**
 * Renders `<MusicPlayer>` with `container={null}` (inline) unless a
 * container prop is given, and exposes the root element and ref handle.
 */
export function renderPlayer(
  props: Partial<MusicPlayerProps> = {},
): PlayerRender {
  const handle = createRef<MusicPlayerHandle | null>()
  const utils = render(
    <MusicPlayer
      audioLists={TRACKS}
      container={null}
      ref={handle}
      {...props}
    />,
  )
  return {
    utils,
    root: () =>
      (utils.container.querySelector('.trmp-root') ??
        document.querySelector('.trmp-root')) as HTMLElement,
    audio: () =>
      (utils.container.querySelector('audio') ??
        document.querySelector('.trmp-root audio')) as HTMLAudioElement,
    handle,
  }
}
