import { useState } from 'react'
import { formatTime } from '../core'
import { RangeSlider, Time } from './controls'
import { usePlayerContext } from './player-context'

const styles = {
  root: 'trmp:flex trmp:w-full trmp:items-center trmp:gap-2',
}

/** Current-time / scrubber / duration row. */
export function ProgressBar() {
  const { state, actions, locale, ui } = usePlayerContext()
  const [scrubbing, setScrubbing] = useState<number | null>(null)
  const value = scrubbing ?? state.currentTime

  return (
    <div className={styles.root} data-status={state.status}>
      <Time
        seconds={value}
        loading={state.status === 'loading'}
        label={locale.loading}
      />
      <RangeSlider
        label={locale.seek}
        value={value}
        min={0}
        max={state.duration || 0}
        step={1}
        buffered={ui.showBuffered ? state.buffered : undefined}
        formatValueText={formatTime}
        disabled={!ui.seekable || state.status === 'idle'}
        onChange={(v) => setScrubbing(v)}
        onCommit={(v) => {
          setScrubbing(null)
          actions.seek(v)
        }}
      />
      <Time
        seconds={state.duration}
        loading={state.status === 'loading'}
        label={locale.loading}
      />
    </div>
  )
}
