import { render } from '@testing-library/react'
import { createRef } from 'react'
import type { RefObject } from 'react'
import { useSortable } from './use-sortable'

const mocks = vi.hoisted(() => {
  class MockSortable {
    static mounted: unknown[] = []
    static mount(...plugins: unknown[]) {
      MockSortable.mounted.push(...plugins)
    }
    options: Record<string, unknown>
    destroyed = false
    constructor(
      public el: HTMLElement,
      options: Record<string, unknown>,
    ) {
      this.options = options
      MockSortable.instances.push(this)
    }
    destroy() {
      this.destroyed = true
    }
    static instances: MockSortable[] = []
  }
  class MockSwap {}
  return { MockSortable, MockSwap }
})
const { MockSortable, MockSwap } = mocks
const instances = MockSortable.instances

vi.mock('sortablejs/modular/sortable.core.esm.js', () => ({
  default: Object.assign(mocks.MockSortable, { Swap: mocks.MockSwap }),
}))

const setup = (enabled = true, options?: Record<string, unknown>) => {
  const ref = createRef<HTMLUListElement | null>()
  const onSortEnd = vi.fn()
  function Host() {
    useSortable(ref as RefObject<HTMLElement | null>, {
      enabled,
      options: options as never,
      onSortEnd,
    })
    return <ul ref={ref} data-testid="list" />
  }
  return { ...render(<Host />), onSortEnd, ref }
}

describe('useSortable', () => {
  beforeEach(() => {
    instances.length = 0
    MockSortable.mounted = []
  })

  it('creates a Sortable with default options merged', () => {
    setup(true, { handle: '.grip' })
    expect(instances).toHaveLength(1)
    expect(instances[0].options).toMatchObject({
      swap: true,
      swapClass: 'trmp-sortable-highlight',
      animation: 100,
      handle: '.grip',
    })
    expect(MockSortable.mounted[0]).toBeInstanceOf(MockSwap)
  })

  it('calls onSortEnd with old/new index', () => {
    const { onSortEnd } = setup()
    const onEnd = instances[0].options.onEnd as (e: unknown) => void
    onEnd({ oldIndex: 1, newIndex: 3 })
    expect(onSortEnd).toHaveBeenCalledWith(1, 3)
  })

  it('ignores onEnd events missing indices', () => {
    const { onSortEnd } = setup()
    const onEnd = instances[0].options.onEnd as (e: unknown) => void
    onEnd({})
    expect(onSortEnd).not.toHaveBeenCalled()
  })

  it('forwards a user-supplied onEnd', () => {
    const userOnEnd = vi.fn()
    setup(true, { onEnd: userOnEnd })
    const onEnd = instances[0].options.onEnd as (e: unknown) => void
    const event = { oldIndex: 0, newIndex: 1 }
    onEnd(event)
    expect(userOnEnd).toHaveBeenCalledWith(event)
  })

  it('does not create an instance when disabled and destroys on cleanup', () => {
    const { unmount } = setup(false)
    expect(instances).toHaveLength(0)
    unmount()
    const enabled = setup()
    expect(instances).toHaveLength(1)
    enabled.unmount()
    expect(instances[0].destroyed).toBe(true)
  })
})
