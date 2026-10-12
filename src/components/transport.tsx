import { IconButton } from './controls'
import { usePlayerContext } from './player-context'

const styles = {
  root: 'trmp:flex trmp:items-center trmp:gap-4',
  skip: 'trmp:text-[28px]',
  play: 'trmp:text-[32px]',
}

/** Previous / play-pause / next transport controls. */
export function Transport() {
  const { state, actions, locale, icons, ui } = usePlayerContext()
  const playing = state.status === 'playing'
  const loading = state.status === 'loading'
  return (
    <div className={styles.root}>
      <IconButton
        label={locale.previous}
        onClick={actions.prev}
        className={styles.skip}
      >
        {icons.prev}
      </IconButton>
      {ui.showPlayButton && (
        <IconButton
          label={playing ? locale.pause : locale.play}
          onClick={actions.togglePlay}
          className={styles.play}
        >
          {loading ? (
            <span className="trmp:animate-spin" aria-hidden="true">
              {icons.loading}
            </span>
          ) : playing ? (
            icons.pause
          ) : (
            icons.play
          )}
        </IconButton>
      )}
      <IconButton
        label={locale.next}
        onClick={actions.next}
        className={styles.skip}
      >
        {icons.next}
      </IconButton>
    </div>
  )
}
