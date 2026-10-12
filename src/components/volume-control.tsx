import { IconButton, RangeSlider } from './controls'
import { usePlayerContext } from './player-context'

const styles = {
  root: 'trmp:hidden trmp:in-data-[layout=desktop]:flex trmp:items-center trmp:gap-1',
  slider: 'trmp:w-[100px] trmp:flex-none',
}

/** Mute toggle + volume slider; hidden in the mobile layout. */
export function VolumeControl() {
  const { state, actions, locale, icons } = usePlayerContext()
  return (
    <div className={styles.root}>
      <IconButton
        label={state.muted ? locale.unmute : locale.mute}
        pressed={state.muted}
        onClick={actions.toggleMute}
      >
        {state.muted ? icons.mute : icons.volume}
      </IconButton>
      <div className={styles.slider}>
        <RangeSlider
          label={locale.volume}
          value={state.volume}
          min={0}
          max={1}
          step={0.01}
          formatValueText={(v) => `${Math.round(v * 100)}%`}
          onChange={actions.setVolume}
          onCommit={actions.setVolume}
        />
      </div>
    </div>
  )
}
