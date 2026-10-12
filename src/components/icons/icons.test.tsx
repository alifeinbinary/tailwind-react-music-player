import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { defaultIcons, PlayIcon } from '.'
import type { IconKey } from '.'

const KEYS: IconKey[] = [
  'play',
  'pause',
  'prev',
  'next',
  'loading',
  'volume',
  'mute',
  'download',
  'reload',
  'lyric',
  'playlist',
  'close',
  'delete',
  'minimize',
  'destroy',
  'order',
  'orderLoop',
  'singleLoop',
  'shuffle',
  'collapse',
  'empty',
  'controller',
]

describe('icons', () => {
  it('defaultIcons covers every IconKey', () => {
    expect(Object.keys(defaultIcons).sort()).toEqual([...KEYS].sort())
  })

  it('renders accessible-hidden svg icons', () => {
    const { container } = render(<>{PlayIcon({}) as ReactNode}</>)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
  })

  it('every default icon node renders an svg', () => {
    for (const key of KEYS) {
      const { container, unmount } = render(<>{defaultIcons[key]}</>)
      expect(container.querySelector('svg'), key).not.toBeNull()
      unmount()
    }
  })
})
