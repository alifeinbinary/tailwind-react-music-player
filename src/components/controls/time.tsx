import classnames from 'classnames'
import { formatTime } from '../../core'

const styles = {
  base: 'trmp:tabular-nums trmp:text-panel-muted trmp:text-[11px]',
}

/** Props for {@link Time}. */
export interface TimeProps {
  /** Seconds; shows `--:--` while `loading`. */
  seconds: number
  loading?: boolean
  /** Accessible label (e.g. locale.seek / "Current time"). */
  label: string
  className?: string
}

/** Formatted playback time with an accessible label. */
export function Time({ seconds, loading, label, className }: TimeProps) {
  const text = loading ? '--:--' : formatTime(seconds)
  return (
    <time
      className={classnames('trmp-time', styles.base, className)}
      aria-label={label}
    >
      {text}
    </time>
  )
}
