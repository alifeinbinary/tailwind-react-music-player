import {
  Cover,
  IconButton,
  reactNodeToText,
  ThemeSwitch,
  TrackTitle,
} from './controls'
import { PlayModeButton } from './play-mode-button'
import { ProgressBar } from './progress-bar'
import { Transport } from './transport'
import { VolumeControl } from './volume-control'
import { usePlayerContext } from './player-context'

const styles = {
  root: 'trmp-panel trmp:fixed trmp:bottom-0 trmp:left-0 trmp:z-50 trmp:flex trmp:h-panel trmp:w-full trmp:items-center trmp:gap-5 trmp:bg-panel trmp:px-[30px] trmp:text-panel-text trmp:shadow-panel',
  column:
    'trmp:flex trmp:min-w-0 trmp:flex-1 trmp:flex-col trmp:justify-center trmp:gap-1',
  controls: 'trmp:flex trmp:flex-none trmp:items-center trmp:gap-4',
  glass:
    'trmp:absolute trmp:inset-0 trmp:-z-10 trmp:scale-[3] trmp:bg-cover trmp:bg-center trmp:blur-[80px]',
  count:
    'trmp:ml-1 trmp:inline-flex trmp:min-w-4 trmp:justify-center trmp:rounded-full trmp:bg-primary trmp:px-1 trmp:text-[10px] trmp:leading-4 trmp:text-primary-contrast',
}

/** Bottom-bar desktop player panel (mode full, desktop layout). */
export function DesktopPanel({
  playlistOpen,
  playlistId,
  lyricVisible,
  onTogglePlaylist,
  onToggleLyric,
  onMinimize,
  onDestroy,
}: {
  playlistOpen: boolean
  playlistId: string
  lyricVisible: boolean
  onTogglePlaylist(): void
  onToggleLyric(): void
  onMinimize(): void
  onDestroy(): void
}) {
  const { state, actions, locale, icons, ui } = usePlayerContext()
  const name = reactNodeToText(state.track?.name)

  return (
    <section
      aria-label={locale.nowPlaying(name)}
      className={styles.root}
      data-glass={ui.glassBackground ? 'true' : undefined}
      data-status={state.status}
    >
      {ui.glassBackground && state.track?.cover && (
        <div
          aria-hidden="true"
          className={styles.glass}
          style={{ backgroundImage: `url("${state.track.cover}")` }}
        />
      )}

      <Cover
        src={state.track?.cover}
        label={name}
        spinning={state.status === 'playing'}
        reset={state.track?.id}
        hideWhenEmpty={ui.hideEmptyCover}
        size={50}
        onClick={
          ui.onCoverClick
            ? () => ui.onCoverClick?.(actions.getAudioInfo())
            : undefined
        }
      />

      <div className={styles.column}>
        <TrackTitle
          info={actions.getAudioInfo()}
          isMobile={state.isMobile}
          render={ui.renderTrackTitle}
          className="trmp:text-[14px]"
        />
        <ProgressBar />
      </div>

      <div className={styles.controls}>
        <Transport />
        {ui.showReload && (
          <IconButton label={locale.reload} onClick={actions.reload}>
            {icons.reload}
          </IconButton>
        )}
        {ui.showDownload && (
          <IconButton
            label={locale.download}
            onClick={() => void actions.download()}
          >
            {icons.download}
          </IconButton>
        )}
        {ui.showThemeSwitch && (
          <ThemeSwitch
            theme={state.resolvedTheme}
            label={locale.theme}
            labels={{ light: locale.lightTheme, dark: locale.darkTheme }}
            onToggle={actions.toggleTheme}
          />
        )}
        {ui.extraControls}
        <VolumeControl />
        {ui.showPlayMode && <PlayModeButton />}
        {ui.showLyric && (
          <IconButton
            label={locale.toggleLyric}
            pressed={lyricVisible}
            onClick={onToggleLyric}
          >
            {icons.lyric}
          </IconButton>
        )}
        <IconButton
          label={locale.playlist}
          aria-expanded={playlistOpen}
          aria-controls={playlistId}
          onClick={onTogglePlaylist}
        >
          {icons.playlist}
          <span className={styles.count}>{state.tracks.length}</span>
        </IconButton>
        {ui.allowModeToggle && (
          <IconButton label={locale.minimize} onClick={onMinimize}>
            {icons.minimize}
          </IconButton>
        )}
        {ui.showDestroy && (
          <IconButton label={locale.destroy} onClick={onDestroy}>
            {icons.destroy}
          </IconButton>
        )}
      </div>
    </section>
  )
}
