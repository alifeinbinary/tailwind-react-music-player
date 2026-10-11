/* eslint-disable no-console */
import Enzyme from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import sortablejs from 'sortablejs'
import { vi } from 'vitest'
import {
  AUDIO_READY_STATE,
  AUDIO_NETWORK_STATE,
} from '../src/config/audioState'

const g = globalThis as any

g.window = window
g.document = window.document
Object.defineProperty(window.navigator, 'userAgent', {
  value: 'node.js',
  configurable: true,
})
g.URL.createObjectURL = vi.fn()
if (typeof window !== 'undefined') {
  g.window.resizeTo = (width: number, height: number) => {
    g.window.innerWidth = width || g.window.innerWidth
    g.window.innerHeight = height || g.window.innerHeight
    g.window.dispatchEvent(new Event('resize'))
  }
  g.window.scrollTo = () => {}
  g.alert = (msg: string) => {
    console.log(msg)
  }
  g.scrollTo = () => {}
  g.window.matchMedia = vi.fn().mockImplementation((query: string) => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
  g.window.URL.revokeObjectURL = vi.fn()
  g.window.HTMLMediaElement.prototype.load = vi.fn()
  g.window.HTMLMediaElement.prototype.play = vi.fn()
  g.window.HTMLMediaElement.prototype.pause = vi.fn()
  Object.defineProperty(g.window.HTMLMediaElement.prototype, 'readyState', {
    get() {
      return AUDIO_READY_STATE.HAVE_ENOUGH_DATA
    },
  })
  Object.defineProperty(g.window.HTMLMediaElement.prototype, 'networkState', {
    get() {
      return AUDIO_NETWORK_STATE.NETWORK_READY_SUCCESS_STATE
    },
  })
  g.window.URL.createObjectURL = vi.fn()
}

Enzyme.configure({ adapter: new Adapter() })

vi.mock('sortablejs', () => {
  const Sortable = vi.fn(function Sortable(this: any) {
    this.destroy = vi.fn()
  })
  return {
    default: Sortable,
    Swap: vi.fn(),
    mount: vi.fn(),
  }
})
;(sortablejs as any).Swap = vi.fn()
;(sortablejs as any).mount = vi.fn()
