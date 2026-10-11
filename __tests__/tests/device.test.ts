import isMobile from 'is-mobile'
import assert from 'assert'

describe('ReactJkMusicPlayer', () => {
  it('test', () => {
    const _isMobile = Object.is(typeof isMobile(), 'boolean')
    assert(_isMobile === true)
  })
})
