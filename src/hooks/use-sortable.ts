import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import Sortable from 'sortablejs/modular/sortable.core.esm.js'

let swapMounted = false

/** Options accepted by {@link useSortable}. */
export interface UseSortableOptions {
  enabled: boolean
  /** Extra Sortable options merged over the defaults. */
  options?: Sortable.Options
  onSortEnd(from: number, to: number): void
}

/**
 * Mounts a `Sortable` (with the `Swap` plugin) on `listRef` while
 * `enabled`. The instance is destroyed on cleanup.
 */
export function useSortable(
  listRef: RefObject<HTMLElement | null>,
  { enabled, options, onSortEnd }: UseSortableOptions,
): void {
  const onSortEndRef = useRef(onSortEnd)
  const optionsRef = useRef(options)
  useEffect(() => {
    onSortEndRef.current = onSortEnd
    optionsRef.current = options
  })

  useEffect(() => {
    const el = listRef.current
    if (!enabled || !el) return undefined
    if (!swapMounted) {
      try {
        Sortable.mount(new Sortable.Swap())
      } catch {
        // double-mount throws in some Sortable versions — plugin stays mounted
      }
      swapMounted = true
    }
    const instance = new Sortable(el, {
      swap: true,
      swapClass: 'trmp-sortable-highlight',
      animation: 100,
      ...optionsRef.current,
      onEnd: (event) => {
        optionsRef.current?.onEnd?.(event)
        if (event.oldIndex !== undefined && event.newIndex !== undefined) {
          onSortEndRef.current(event.oldIndex, event.newIndex)
        }
      },
    })
    return () => instance.destroy()
  }, [listRef, enabled])
}
