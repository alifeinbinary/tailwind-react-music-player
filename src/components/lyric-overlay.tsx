import classnames from 'classnames'
import { useRef } from 'react'
import Draggable from 'react-draggable'
import { usePlayerContext } from './player-context'

const styles = {
  root: 'trmp:fixed trmp:bottom-[110px] trmp:left-1/2 trmp:z-40 trmp:-translate-x-1/2 trmp:cursor-move trmp:rounded trmp:bg-panel trmp:px-4 trmp:py-2 trmp:text-center trmp:text-lyric trmp:leading-snug trmp:in-data-[layout=mobile]:text-lyric-mobile trmp:shadow-panel',
}

/** Floating draggable lyric overlay showing the current line. */
export function LyricOverlay() {
  const { state, locale, ui } = usePlayerContext()
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const body = (
    <div
      ref={nodeRef}
      aria-live="polite"
      className={classnames('trmp-lyric', styles.root, ui.lyricClassName)}
    >
      {state.currentLyric ?? locale.noLyric}
    </div>
  )
  if (!ui.draggable) return body
  return <Draggable nodeRef={nodeRef}>{body}</Draggable>
}
