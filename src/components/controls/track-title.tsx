import classnames from 'classnames'
import type { ReactNode } from 'react'
import type { AudioInfo } from '../../types'

const styles = {
  base: 'trmp:min-w-0 trmp:truncate trmp:text-panel-text',
}

/** Props for {@link TrackTitle}. */
export interface TrackTitleProps {
  info: AudioInfo
  isMobile?: boolean
  /** Custom renderer; falls back to "name - singer". */
  render?(info: AudioInfo, isMobile: boolean): ReactNode
  className?: string
}

const toText = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return ''
}

/** "name - singer" title line, truncating, with a plain-text title attr. */
export function TrackTitle({
  info,
  isMobile = false,
  render,
  className,
}: TrackTitleProps) {
  const track = info.track
  const fallback =
    [track?.name, track?.singer].filter(Boolean).join(' - ') || ''
  const rendered = render?.(info, isMobile)
  const content = rendered ?? fallback
  const title = rendered ? toText(rendered) : fallback
  return (
    <span
      className={classnames('trmp-track-title', styles.base, className)}
      title={title || undefined}
    >
      {content}
    </span>
  )
}
