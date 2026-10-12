import { useEffect, useRef } from 'react'
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
import { usePlayerContext } from './player-context'
import { useFocusReturn } from './use-focus-return'

const styles = {
  root: 'trmp-mobile trmp:fixed trmp:inset-0 trmp:z-50 trmp:flex trmp:flex-col trmp:bg-panel-mobile trmp:text-panel-text',
  header:
    'trmp:flex trmp:h-panel-header trmp:items-center trmp:justify-between trmp:border-b trmp:border-panel-muted trmp:px-4',
  title: 'trmp:truncate trmp:text-center trmp:flex-1',
  body: 'trmp:flex trmp:flex-1 trmp:flex-col trmp:items-center trmp:justify-center trmp:gap-4 trmp:p-6',
  cover: 'trmp:size-60 trmp:shadow-panel',
  singer: 'trmp:text-panel-muted',
  bottom:
    'trmp:flex trmp:items-center trmp:justify-center trmp:gap-2 trmp:pb-6',
  count:
    'trmp:ml-1 trmp:inline-flex trmp:min-w-4 trmp:justify-center trmp:rounded-full trmp:bg-primary trmp:px-1 trmp:text-[10px] trmp:leading-4 trmp:text-primary-contrast',
}

/** Full-screen mobile panel (mode full, mobile layout). */
export function MobilePanel({
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
  const rootRef = useRef<HTMLElement | null>(null)
  useFocusReturn(rootRef, true)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMinimize()
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [onMinimize])

  return (
    <section
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={locale.nowPlaying(reactNodeToText(state.track?.name))}
      tabIndex={-1}
      className={styles.root}
      data-status={state.status}
    >
      <div className={styles.header}>
        <IconButton label={locale.minimize} onClick={onMinimize}>
          {icons.collapse}
        </IconButton>
        <div className={styles.title}>
          <TrackTitle
            info={actions.getAudioInfo()}
            isMobile
            render={ui.renderTrackTitle}
          />
        </div>
        {ui.showThemeSwitch && (
          <ThemeSwitch
            theme={state.resolvedTheme}
            label={locale.theme}
            labels={{ light: locale.lightTheme, dark: locale.darkTheme }}
            onToggle={actions.toggleTheme}
          />
        )}
      </div>

      <div className={styles.body}>
        <Cover
          src={state.track?.cover}
          label={reactNodeToText(state.track?.name)}
          spinning={state.status === 'playing'}
          reset={state.track?.id}
          hideWhenEmpty={ui.hideEmptyCover}
          size={240}
          className={styles.cover}
        />
        <div className={styles.singer}>{state.track?.singer}</div>
        <ProgressBar />
        <Transport />
      </div>

      <div className={styles.bottom}>
        {ui.showPlayMode && <PlayModeButton />}
        {ui.showDownload && (
          <IconButton
            label={locale.download}
            onClick={() => void actions.download()}
          >
            {icons.download}
          </IconButton>
        )}
        {ui.showReload && (
          <IconButton label={locale.reload} onClick={actions.reload}>
            {icons.reload}
          </IconButton>
        )}
        {ui.showLyric && (
          <IconButton
            label={locale.toggleLyric}
            pressed={lyricVisible}
            onClick={onToggleLyric}
          >
            {icons.lyric}
          </IconButton>
        )}
        {ui.extraControls}
        <IconButton
          label={locale.playlist}
          aria-expanded={playlistOpen}
          aria-controls={playlistId}
          onClick={onTogglePlaylist}
        >
          {icons.playlist}
          <span className={styles.count}>{state.tracks.length}</span>
        </IconButton>
        {ui.showDestroy && (
          <IconButton label={locale.destroy} onClick={onDestroy}>
            {icons.destroy}
          </IconButton>
        )}
      </div>
    </section>
  )
}
