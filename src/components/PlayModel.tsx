import cls from 'classnames'
import React, { memo, ReactNode } from 'react'

export interface PlayModelProps {
  visible: boolean
  value: ReactNode
}

const PlayModel = ({ visible, value }: PlayModelProps) => (
  <div
    className={cls(
      'play-mode-title',
      'select-none fixed right-18 bottom-(--rjmp-panel-height) px-5 py-1.25 bg-black/50 text-white leading-normal text-center origin-bottom z-1000 transition-all duration-(--rjmp-animate-time) ease-(--rjmp-animate-type)',
      {
        'play-mode-title-visible opacity-100 visible translate-x-0 pointer-events-auto': visible,
        'opacity-0 invisible translate-x-full pointer-events-none': !visible,
      },
    )}
  >
    {value}
  </div>
)

export default memo(PlayModel)
