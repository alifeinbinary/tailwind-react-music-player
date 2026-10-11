import cls from 'classnames'
import React, { memo } from 'react'

const PlayModeTip = ({ prefix, visible, title, text }) => (
  <div
    className={cls(
      `${prefix}-play-model-tip`,
      'fixed left-0 top-0 w-full h-8.75 leading-8.75 bg-(--rjmp-primary-color) text-white px-5 z-1000 shadow-[0_2px_20px_rgba(0,0,0,0.1)] translate-y-[-105%] transition-transform duration-(--rjmp-animate-time) ease-(--rjmp-animate-type) flex items-center',
      {
        'show translate-y-0': visible,
      },
    )}
  >
    <span
      className={`${prefix}-play-model-tip-title mr-3 [&_svg]:animate-none! [&_svg]:align-text-bottom! [&_.loop-btn]:flex max-md:[&_svg]:text-[19px] max-md:[&_svg]:text-white!`}
    >
      {title}
    </span>
    <span className={`${prefix}-play-model-tip-text text-sm`}>{text}</span>
  </div>
)

export default memo(PlayModeTip)
