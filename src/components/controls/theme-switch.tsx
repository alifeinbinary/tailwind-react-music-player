import classnames from 'classnames'
import type { ResolvedTheme } from '../../types'

const styles = {
  base: 'trmp:relative trmp:inline-flex trmp:items-center trmp:rounded-full trmp:border trmp:border-panel-muted trmp:text-[11px] trmp:leading-none trmp:text-panel-muted trmp:px-1 trmp:py-0.5 trmp:gap-1',
  thumb:
    'trmp:inline-block trmp:rounded-full trmp:px-1.5 trmp:py-0.5 trmp:text-panel-text/70 trmp:data-[on=true]:bg-primary trmp:data-[on=true]:text-white',
}

/** Props for {@link ThemeSwitch}. */
export interface ThemeSwitchProps {
  /** Currently resolved theme. */
  theme: ResolvedTheme
  /** Switch label (locale.theme). */
  label: string
  /** Short labels rendered inside the switch. */
  labels: { light: string; dark: string }
  onToggle(): void
  className?: string
}

/** Light/dark theme toggle rendered as an ARIA switch. */
export function ThemeSwitch({
  theme,
  label,
  labels,
  onToggle,
  className,
}: ThemeSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === 'light'}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={classnames('trmp-theme-switch', styles.base, className)}
    >
      <span data-on={theme === 'dark'} className={styles.thumb}>
        {labels.dark}
      </span>
      <span data-on={theme === 'light'} className={styles.thumb}>
        {labels.light}
      </span>
    </button>
  )
}
