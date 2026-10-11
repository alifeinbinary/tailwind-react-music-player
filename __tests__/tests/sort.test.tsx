import React from 'react'
import { mount } from 'enzyme'
import Sortable from 'sortablejs'
import ReactJkMusicPlayer from '../../src'

const createPlayer = (props?: any) => {
  return mount<ReactJkMusicPlayer>(
    <ReactJkMusicPlayer
      audioLists={[
        { cover: 'xx', musicSrc: '1' },
        { cover: 'xx', musicSrc: '2' },
      ]}
      autoPlay={false}
      {...props}
    />,
  )
}

describe('Audio lists Sort test', () => {
  it('should not call onAudioListsSortEnd and onAudioListsChange if index not changed', () => {
    const onAudioListsSortEnd = vi.fn()
    const onAudioListsChange = vi.fn()
    const wrapper = createPlayer({ onAudioListsSortEnd, onAudioListsChange })
    wrapper.instance().onAudioListsSortEnd({ oldIndex: 0, newIndex: 0 } as any)

    expect(onAudioListsSortEnd).not.toHaveBeenCalled()
    expect(onAudioListsChange).not.toHaveBeenCalled()
  })

  it('should sort audio list', () => {
    let list: any
    const onAudioListsSortEnd = vi.fn()
    const onAudioListsChange = vi.fn((_, result) => {
      list = result
    })
    const wrapper = createPlayer({ onAudioListsSortEnd, onAudioListsChange })
    wrapper.instance().onAudioListsSortEnd({ oldIndex: 0, newIndex: 1 } as any)

    expect(onAudioListsSortEnd).toHaveBeenCalledWith(0, 1)
    expect(onAudioListsChange).toHaveBeenCalledTimes(1)
    expect(list[0].musicSrc).toEqual('2')
    expect(list[1].musicSrc).toEqual('1')
  })

  it('should deprecate onAudioListsDragEnd', () => {
    const warnSpy = vi.spyOn(console, 'warn')
    const onAudioListsDragEnd = vi.fn()
    const wrapper = createPlayer({ onAudioListsDragEnd })
    wrapper.instance().onAudioListsSortEnd({ oldIndex: 0, newIndex: 1 } as any)

    expect(onAudioListsDragEnd).toHaveBeenCalledWith(0, 1)
    expect(warnSpy).toHaveBeenCalledWith(
      '[Deprecated] onAudioListsDragEnd is deprecated. please use onAudioListsSortEnd(oldIndex, newIndex){}',
    )
  })

  it('should render correctly when audio lists is empty', () => {
    ;(Sortable as any).mockClear()
    const errorSpy = vi.spyOn(console, 'error')
    createPlayer({ audioLists: [] })
    expect(errorSpy).not.toThrowError()
  })
})
