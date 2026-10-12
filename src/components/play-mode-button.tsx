import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { IconButton, Toast } from './controls'
import { usePlayerContext } from './player-context'

const styles = {
  root: 'trmp:relative',
  icon: 'trmp:block trmp:animate-scale-in',
  toast:
    'trmp:absolute trmp:bottom-full trmp:left-1/2 trmp:-translate-x-1/2 trmp:whitespace-nowrap',
}

/** Cycles play modes and flashes the new mode name in a toast. */
export function PlayModeButton() {
  const { state, actions, locale, icons, ui } = usePlayerContext()
  const [toastKey, setToastKey] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const iconFor = (mode: string): ReactNode =>
    mode === 'order'
      ? icons.order
      : mode === 'orderLoop'
        ? icons.orderLoop
        : mode === 'singleLoop'
          ? icons.singleLoop
          : icons.shuffle

  const onClick = () => {
    actions.cyclePlayMode()
    if (timerRef.current) clearTimeout(timerRef.current)
    setToastKey(Date.now())
    timerRef.current = setTimeout(
      () => setToastKey(null),
      ui.playModeTipDuration,
    )
  }

  return (
    <div className={styles.root}>
      <IconButton
        label={locale.playMode[state.playMode]}
        onClick={onClick}
        data-play-mode={state.playMode}
      >
        <span key={state.playMode} className={styles.icon} aria-hidden="true">
          {iconFor(state.playMode)}
        </span>
      </IconButton>
      {toastKey !== null && (
        <Toast key={toastKey} visible className={styles.toast}>
          {locale.playMode[state.playMode]}
        </Toast>
      )}
    </div>
  )
}
