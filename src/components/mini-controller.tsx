import classnames from 'classnames'
import { useRef, useState } from 'react'
import Draggable from 'react-draggable'
import type { DraggableData, DraggableEvent } from 'react-draggable'
import { CircleProgress, Cover, IconButton, reactNodeToText } from './controls'
import { usePlayerContext } from './player-context'

const styles = {
  root: 'trmp:fixed trmp:z-50 trmp:flex trmp:items-center trmp:rounded-[50%] trmp:bg-controller trmp:shadow-panel',
  button:
    'trmp:relative trmp:flex trmp:items-center trmp:justify-center trmp:rounded-[50%] trmp:size-controller trmp:in-data-[layout=mobile]:size-controller-mobile trmp:overflow-hidden',
  spinner: 'trmp:absolute trmp:animate-spin trmp:text-primary trmp:text-xl',
  cover: 'trmp:size-[70%]',
  progress: 'trmp:absolute trmp:inset-0 trmp:m-auto',
  destroy:
    'trmp:absolute trmp:-top-1 trmp:-right-1 trmp:size-5 trmp:rounded-[50%] trmp:bg-panel trmp:text-panel-text trmp:text-xs',
}

/** Drag distance (px) below which a gesture counts as a click. */
const CLICK_THRESHOLD_PX = 4

/** Floating round mini controller; draggable when `ui.draggable`. */
export function MiniController({ onDestroy }: { onDestroy(): void }) {
  const { state, actions, locale, icons, ui } = usePlayerContext()
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const dragDistance = useRef(0)
  const [position, setPosition] = useState<
    { x: number; y: number } | undefined
  >(undefined)

  const progress = state.duration > 0 ? state.currentTime / state.duration : 0
  const onDrag = (_e: DraggableEvent, data: DraggableData) => {
    dragDistance.current = Math.max(
      dragDistance.current,
      Math.hypot(data.x - (data.lastX ?? data.x), 0),
      Math.abs(data.x) + Math.abs(data.y) > 0
        ? Math.hypot(data.x - (position?.x ?? 0), data.y - (position?.y ?? 0))
        : 0,
    )
    setPosition({ x: data.x, y: data.y })
  }
  const onStart = () => {
    dragDistance.current = 0
  }
  const onClick = () => {
    if (dragDistance.current <= CLICK_THRESHOLD_PX) actions.toggleMode()
    dragDistance.current = 0
  }

  const controller = (
    <div
      ref={nodeRef}
      className={classnames('trmp-mini', styles.root)}
      style={ui.defaultPosition}
    >
      <button
        type="button"
        aria-label={locale.open}
        aria-expanded={state.mode === 'full'}
        data-status={state.status}
        className={styles.button}
        onClick={onClick}
      >
        {ui.showMiniCover && (
          <Cover
            src={state.track?.cover}
            label={locale.nowPlaying(reactNodeToText(state.track?.name))}
            hideWhenEmpty={ui.hideEmptyCover}
            className={styles.cover}
          />
        )}
        {state.status === 'loading' && (
          <span aria-hidden="true" className={styles.spinner}>
            {icons.loading}
          </span>
        )}
        {ui.showMiniProgress && (
          <CircleProgress
            progress={progress}
            size={76}
            className={styles.progress}
          />
        )}
      </button>
      {ui.showDestroy && (
        <IconButton
          label={locale.destroy}
          size="sm"
          className={styles.destroy}
          onClick={onDestroy}
        >
          {icons.destroy}
        </IconButton>
      )}
    </div>
  )

  if (!ui.draggable) return controller
  return (
    <Draggable
      nodeRef={nodeRef}
      bounds={ui.dragBounds}
      position={position}
      onStart={onStart}
      onDrag={onDrag}
    >
      {controller}
    </Draggable>
  )
}
