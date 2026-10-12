import { useCallback, useEffect, useRef, useState } from 'react'

export interface ControllableStateOptions<T> {
  /** Controlled value; when `undefined` the state is uncontrolled. */
  value?: T
  /** Initial value when uncontrolled. */
  defaultValue: T
  /** Fires with the resolved value on every setter call. */
  onChange?: (value: T) => void
}

/**
 * Standard controlled/uncontrolled state: controlled `value` wins,
 * otherwise internal state seeded by `defaultValue`. The setter accepts a
 * value or updater and always notifies `onChange`.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: ControllableStateOptions<T>): [T, (next: T | ((prev: T) => T)) => void] {
  const [internal, setInternal] = useState<T>(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : internal

  const refs = useRef({ controlled, current, onChange })
  useEffect(() => {
    refs.current = { controlled, current, onChange }
  })

  const set = useCallback((next: T | ((prev: T) => T)) => {
    const r = refs.current
    const resolved =
      typeof next === 'function' ? (next as (prev: T) => T)(r.current) : next
    if (!r.controlled) setInternal(resolved)
    r.onChange?.(resolved)
  }, [])

  return [current, set]
}
