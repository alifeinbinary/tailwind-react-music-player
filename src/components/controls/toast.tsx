import classnames from 'classnames'
import type { ReactNode } from 'react'

const styles = {
  base: 'trmp:pointer-events-none trmp:flex trmp:items-center trmp:gap-1 trmp:rounded trmp:bg-panel trmp:px-3 trmp:py-1.5 trmp:text-[13px] trmp:text-panel-text trmp:shadow-panel',
  visible: 'trmp:animate-slide-up',
  hidden: 'trmp:hidden',
}

/** Props for {@link Toast}. */
export interface ToastProps {
  visible: boolean
  children?: ReactNode
  className?: string
}

/** Polite live-region toast (replaces PlayModel / PlayModeTip). */
export function Toast({ visible, children, className }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={classnames(
        'trmp-toast',
        styles.base,
        visible ? styles.visible : styles.hidden,
        className,
      )}
    >
      {children}
    </div>
  )
}
