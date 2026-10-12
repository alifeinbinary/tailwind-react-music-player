import { act, fireEvent, render } from '@testing-library/react'
import React from 'react'

export const sleep = (duration: number) =>
  new Promise<void>((res) => {
    setTimeout(() => {
      res()
    }, duration)
  })

const isClassComponent = (type: any) =>
  typeof type === 'function' &&
  type.prototype &&
  type.prototype.isReactComponent

export interface DOMWrapper {
  length: number
  exists: () => boolean
  at: (index: number) => DOMWrapper
  first: () => DOMWrapper
  last: () => DOMWrapper
  simulate: (event: 'click') => void
  text: () => string
  prop: (name: string) => any
  hasClass: (name: string) => boolean
  getDOMNode: () => Element | null
  find: (selector: string) => DOMWrapper
}

const wrapElements = (elements: Element[]): DOMWrapper => ({
  length: elements.length,
  exists: () => elements.length > 0,
  at: (index: number) =>
    wrapElements(
      index >= 0 && index < elements.length ? [elements[index]] : [],
    ),
  first: () => wrapElements(elements.slice(0, 1)),
  last: () => wrapElements(elements.slice(-1)),
  simulate: (event: 'click') => {
    elements.forEach((el) => {
      if (event === 'click') {
        fireEvent.click(el)
      }
    })
  },
  text: () => elements.map((el) => el.textContent || '').join(''),
  prop: (name: string) => {
    const el = elements[0]
    return el ? el.getAttribute(name) : undefined
  },
  hasClass: (name: string) =>
    elements.length > 0 && elements[0].classList.contains(name),
  getDOMNode: () => elements[0] || null,
  find: (selector: string) => {
    const nodes: Element[] = []
    elements.forEach((el) => {
      nodes.push(...Array.from(el.querySelectorAll(selector)))
    })
    return wrapElements(nodes)
  },
})

/**
 * Minimal Enzyme `mount` replacement built on @testing-library/react.
 *
 * The player renders via `createPortal` into `getContainer()`, so each mounted
 * player gets its own container element appended to `document.body` — queries
 * are scoped to it, which keeps multiple mounted players isolated the same way
 * Enzyme wrappers were.
 */
export const mount = <P>(element: React.ReactElement<P>) => {
  const componentType = element.type as any
  const props = (element.props || {}) as Record<string, any>

  const instanceRef = React.createRef<any>()
  const ownContainer = document.createElement('div')
  document.body.appendChild(ownContainer)

  let currentElement = element as React.ReactElement<any>
  if (isClassComponent(componentType)) {
    const injections: Record<string, any> = { ref: instanceRef }
    // Give each mounted player an isolated portal container unless the test
    // provides its own getContainer. React applies class defaultProps at
    // createElement time, so a default-filled prop is the same function
    // reference as defaultProps.getContainer.
    const defaultGetContainer = componentType.defaultProps?.getContainer
    if (
      typeof defaultGetContainer === 'function' &&
      (props.getContainer === undefined ||
        props.getContainer === defaultGetContainer)
    ) {
      injections.getContainer = () => ownContainer
    }
    currentElement = React.cloneElement(
      element as React.ReactElement<any>,
      injections,
    )
  }

  const rtl = render(currentElement)

  // Wrap instance methods in act() so state updates they trigger don't
  // produce "not wrapped in act" console.error noise during tests.
  const instance = (): any => {
    const target = instanceRef.current
    if (!target) {
      return target
    }
    return new Proxy(target, {
      get: (obj, key) => {
        const value = (obj as any)[key]
        if (typeof value !== 'function') {
          return value
        }
        return (...args: any[]) => {
          // act() returns a thenable, not the callback's value — capture the
          // method's return value so things like getBaseAudioInfo() work.
          let result: any
          act(() => {
            result = value.apply(obj, args)
          })
          return result
        }
      },
      set: (obj, key, value) => Reflect.set(obj, key, value),
    })
  }

  // React 19 defers setState calls made outside act(); an empty act flushes
  // any pending updates so queries/state reads see the latest tree.
  const flush = () => act(() => {})

  const query = (selector: string) => {
    flush()
    return [
      ...Array.from(rtl.container.querySelectorAll(selector)),
      ...Array.from(ownContainer.querySelectorAll(selector)),
    ]
  }

  return {
    container: rtl.container,
    portalContainer: ownContainer,
    instance,
    find: (selector: string) => wrapElements(query(selector)),
    props: () => instance()?.props,
    prop: (name: string) => instance()?.props?.[name],
    state: (key?: string) => {
      flush()
      return key === undefined ? instance()?.state : instance()?.state?.[key]
    },
    setState: (partial: any, cb?: () => void) => {
      act(() => {
        instance().setState(partial, cb)
      })
    },
    setProps: (next: Record<string, any>, cb?: () => void) => {
      act(() => {
        currentElement = React.cloneElement(currentElement, next)
        rtl.rerender(currentElement)
      })
      cb?.()
    },
    update: () => {},
    unmount: () => {
      rtl.unmount()
      ownContainer.remove()
    },
    text: () => {
      flush()
      return ownContainer.textContent || ''
    },
    render: () => {
      flush()
      return ownContainer.innerHTML
    },
  }
}

export type PlayerWrapper = ReturnType<typeof mount>
