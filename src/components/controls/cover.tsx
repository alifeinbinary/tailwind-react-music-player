import classnames from 'classnames'
import { useState } from 'react'
import { escapeCssUrl } from '../../core'

const styles = {
  base: 'trmp:overflow-hidden trmp:rounded-[50%] trmp:bg-center trmp:bg-cover',
  spinning: 'trmp:animate-spin',
  paused: 'trmp:[animation-play-state:paused]',
  button: 'trmp:block trmp:p-0',
}

/** Props for {@link Cover}. */
export interface CoverProps {
  /** Image URL; falsy hides when `hideWhenEmpty`. */
  src?: string
  /** Accessible description (alt equivalent). */
  label: string
  /** Animate rotation (track playing). */
  spinning?: boolean
  /** Bumps reset the rotation (e.g. track id). */
  reset?: unknown
  /** Hide the element when `src` is empty. */
  hideWhenEmpty?: boolean
  /** When set, the cover renders as a labelled button. */
  onClick?: () => void
  size?: number
  className?: string
}

/** Rotating cover-art disc; a button when `onClick` is provided. */
export function Cover({
  src,
  label,
  spinning = false,
  reset,
  hideWhenEmpty = false,
  onClick,
  size = 40,
  className,
}: CoverProps) {
  // remount-on-change (adjust-state-during-render pattern) restarts the
  // CSS animation when `reset` changes
  const [resetKey, setResetKey] = useState(0)
  const [prevReset, setPrevReset] = useState(reset)
  if (reset !== prevReset) {
    setPrevReset(reset)
    setResetKey((k) => k + 1)
  }

  if (!src && hideWhenEmpty) return null

  const cls = classnames(
    'trmp-cover',
    styles.base,
    spinning ? styles.spinning : styles.paused,
    className,
  )
  const style = {
    width: size,
    height: size,
    backgroundImage: src ? escapeCssUrl(src) : undefined,
  }

  if (onClick) {
    return (
      <button
        key={resetKey}
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className={classnames(cls, styles.button)}
        style={style}
      />
    )
  }
  return (
    <div
      key={resetKey}
      role="img"
      aria-label={label}
      className={cls}
      style={style}
    />
  )
}
