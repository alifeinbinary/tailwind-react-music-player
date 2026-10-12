import classnames from 'classnames'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

const styles = {
  base: 'trmp:inline-flex trmp:items-center trmp:justify-center trmp:rounded-[50%] trmp:text-panel-text trmp:transition-colors trmp:hover:text-primary',
  active: 'trmp:text-primary',
  disabled: 'trmp:opacity-40 trmp:cursor-default',
  sm: 'trmp:size-6',
  md: 'trmp:size-8',
  lg: 'trmp:size-10',
}

/** Props for {@link IconButton}. */
export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  /** Accessible name — used for both `aria-label` and `title`. */
  label: string
  /** Toggled state for toggle-style buttons (aria-pressed). */
  pressed?: boolean
  /** Visual active highlight. */
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}

/** Icon-only button with label, pressed/active states and size variants. */
export function IconButton({
  label,
  pressed,
  active = false,
  size = 'md',
  disabled,
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={classnames(
        'trmp-icon-button',
        styles.base,
        styles[size],
        { [styles.active]: active, [styles.disabled]: disabled },
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
