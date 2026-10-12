/** Props for {@link CircleProgress}. */
export interface CircleProgressProps {
  /** Completion 0..1. */
  progress: number
  /** Diameter in px. Default 40. */
  size?: number
  /** Ring color — defaults to the primary token. */
  color?: string
  className?: string
}

/** Decorative circular progress ring (aria-hidden). */
export function CircleProgress({
  progress,
  size = 40,
  color = 'var(--trmp-color-primary)',
  className,
}: CircleProgressProps) {
  const clamped = Math.min(Math.max(progress, 0), 1)
  const stroke = 3
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeOpacity={0.25}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}
