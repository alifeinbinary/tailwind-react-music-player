import { act, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createRef } from 'react'
import type { UseMusicPlayerOptions, UseMusicPlayerResult } from '../types'
import { useMusicPlayer } from '../hooks/use-music-player'

export interface PlayerHarness {
  /** Latest value returned by `useMusicPlayer`. */
  result(): UseMusicPlayerResult
  /** The rendered `<audio>` element. */
  audio(): HTMLAudioElement
  /** Re-renders the harness with new options. */
  rerender(nextOptions: UseMusicPlayerOptions): void
  unmount(): void
  rootRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Renders a minimal harness around `useMusicPlayer`: a root div plus the
 * `<audio>` element wired to `audioProps`. Interactions should be wrapped
 * in `act` by the caller.
 */
export function renderPlayerHook(
  options: UseMusicPlayerOptions,
  { wrapper }: { wrapper?: (node: ReactNode) => ReactNode } = {},
): PlayerHarness {
  let latest: UseMusicPlayerResult | undefined
  const rootRef = createRef<HTMLDivElement | null>()

  function Harness(props: { opts: UseMusicPlayerOptions }) {
    const result = useMusicPlayer(props.opts)
    latest = result
    const inner = (
      <>
        <audio data-testid="audio" {...result.audioProps}>
          <track kind="captions" />
        </audio>
        <div data-testid="root" ref={rootRef} />
      </>
    )
    return <>{wrapper ? wrapper(inner) : inner}</>
  }

  const utils = render(<Harness opts={options} />)
  return {
    result: () => {
      if (!latest) throw new Error('hook has not rendered yet')
      return latest
    },
    audio: () => utils.container.querySelector('audio') as HTMLAudioElement,
    rerender(nextOptions: UseMusicPlayerOptions) {
      act(() => utils.rerender(<Harness opts={nextOptions} />))
    },
    unmount: () => utils.unmount(),
    rootRef,
  }
}

/** Flushes pending microtasks (e.g. fake-media canplay) inside act. */
export async function flushMicrotasks(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) {
    await act(async () => {})
  }
}
