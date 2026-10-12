// 迷你模式进度条
import { memo } from 'react'

const circleClass =
  'transform-[matrix(0,-1,1,0,0,80)] max-md:transform-[matrix(0,-1,1,0,0,60)] transition-[stroke-dasharray] duration-(--rjmp-animate-time) ease-(--rjmp-animate-type)'

export interface CircleProcessBarProps {
  progress?: number
  r?: number
}

const CircleProcessBar = ({ progress = 0, r = 40 }: CircleProcessBarProps) => {
  const currentProgress = progress.toFixed(2)
  const perimeter = Math.PI * 2 * r
  const strokeDasharray = `${Math.floor(
    perimeter * Number(currentProgress),
  )} ${Math.floor(perimeter * (1 - Number(currentProgress)))}`
  return (
    <svg className="audio-circle-process-bar pointer-events-none w-(--rjmp-player-size) h-(--rjmp-player-size) absolute left-0 -top-(--rjmp-player-size) z-100 animate-[scaleTo_var(--rjmp-animate-time)_var(--rjmp-animate-type)] stroke-[3px] [stroke-linejoin:round] transform-[matrix(0,-1,1,0,0,80)] max-md:transform-[matrix(0,-1,1,0,0,60)] transition-[stroke-dasharray] duration-(--rjmp-animate-time) ease-(--rjmp-animate-type)">
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill="none"
        className={`stroke stroke-(--rjmp-primary-color) ${circleClass}`}
        strokeDasharray={strokeDasharray}
      />
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill="none"
        className={`bg stroke-white ${circleClass}`}
        strokeDasharray="0 1000"
      />
    </svg>
  )
}

export default memo(CircleProcessBar)
