import classnames from 'classnames'
import { useRef } from 'react'
import type {
  ChangeEvent,
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
} from 'react'

const styles = {
  wrap: 'trmp:relative trmp:flex trmp:items-center',
  buffered:
    'trmp:absolute trmp:inset-y-0 trmp:left-0 trmp:my-auto trmp:rounded-[3px] trmp:bg-track-buffered trmp:pointer-events-none',
  input: 'trmp-range trmp:w-full',
}

/** Props for {@link RangeSlider}. */
export interface RangeSliderProps {
  /** Accessible name. */
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  /** Fired while dragging / on arrow keys (input event). */
  onChange(value: number): void
  /** Fired on pointerup / keyup / change — the committed value. */
  onCommit?(value: number): void
  /** Custom `aria-valuetext`. */
  formatValueText?(value: number): string
  /** Buffered fraction 0..1, drawn behind the track. */
  buffered?: number
  disabled?: boolean
  className?: string
  style?: CSSProperties
}

/** Accessible native range input with a filled-track CSS variable. */
export function RangeSlider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  onCommit,
  formatValueText,
  buffered,
  disabled,
  className,
  style,
}: RangeSliderProps) {
  const commitRef = useRef<number | null>(null)

  const pct =
    max === min
      ? 0
      : ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    commitRef.current = v
    onChange(v)
  }
  const commit = () => {
    if (commitRef.current !== null) {
      const v = commitRef.current
      commitRef.current = null
      onCommit?.(v)
    }
  }
  const handlePointerUp = (_e: PointerEvent<HTMLInputElement>) => commit()
  const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') {
      commit()
    }
  }

  return (
    <div className={classnames('trmp-range-wrap', styles.wrap)}>
      {buffered !== undefined && (
        <span
          aria-hidden="true"
          className={styles.buffered}
          style={{
            width: `${Math.min(Math.max(buffered, 0), 1) * 100}%`,
            height: 'var(--trmp-spacing-track-h)',
          }}
        />
      )}
      <input
        type="range"
        className={classnames('trmp-range', styles.input, className)}
        style={{
          ['--trmp-range-fill' as never]: `${pct}%`,
          ...style,
        }}
        aria-label={label}
        aria-valuetext={formatValueText?.(value)}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={handleChange}
        onPointerUp={handlePointerUp}
        onKeyUp={handleKeyUp}
        onBlur={commit}
      />
    </div>
  )
}
