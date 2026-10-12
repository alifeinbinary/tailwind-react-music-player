import classnames from 'classnames'
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Ref } from 'react'
import { createPortal } from 'react-dom'
import { TIMING } from '../constants'
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts'
import { useMusicPlayer } from '../hooks/use-music-player'
import { resolveLocale } from '../i18n'
import type {
  MusicPlayerHandle,
  MusicPlayerProps,
  MusicPlayerUIProps,
} from '../types'
import { reactNodeToText } from './controls'
import { DesktopPanel } from './desktop-panel'
import { defaultIcons } from './icons'
import { LyricOverlay } from './lyric-overlay'
import { MiniController } from './mini-controller'
import { MobilePanel } from './mobile-panel'
import { PlayerProvider } from './player-context'
import { PlaylistPanel } from './playlist-panel'
import type { PlayerContextValue } from './player-context'

const styles = {
  audio:
    'trmp:absolute trmp:size-px trmp:overflow-hidden trmp:clip-path-[inset(50%)]',
}

const DEFAULT_UI: PlayerContextValue['ui'] = {
  draggable: true,
  allowModeToggle: true,
  responsive: true,
  seekable: true,
  glassBackground: false,
  hideEmptyCover: false,
  showMiniCover: true,
  showMiniProgress: false,
  showBuffered: true,
  showPlayButton: true,
  showReload: true,
  showDownload: true,
  showPlayMode: true,
  showThemeSwitch: true,
  showLyric: false,
  showDestroy: false,
  removable: true,
  keyboardShortcuts: false,
  defaultPosition: { right: 30, bottom: 30 },
  playModeTipDuration: TIMING.PLAY_MODE_TIP_MS,
}

// `satisfies` makes this a compile error if a new MusicPlayerUIProps key is
// added without a matching entry here.
const UI_PROP_KEYS = new Set(
  Object.keys({
    className: true,
    style: true,
    container: true,
    locale: true,
    icons: true,
    draggable: true,
    dragBounds: true,
    defaultPosition: true,
    allowModeToggle: true,
    responsive: true,
    seekable: true,
    glassBackground: true,
    hideEmptyCover: true,
    showMiniCover: true,
    showMiniProgress: true,
    showBuffered: true,
    showPlayButton: true,
    showReload: true,
    showDownload: true,
    showPlayMode: true,
    showThemeSwitch: true,
    showLyric: true,
    showDestroy: true,
    removable: true,
    sortable: true,
    keyboardShortcuts: true,
    playModeTipDuration: true,
    extraControls: true,
    lyricClassName: true,
    renderTrackTitle: true,
    onCoverClick: true,
    onPlaylistToggle: true,
    onBeforeDestroy: true,
    onDestroyed: true,
  } satisfies Record<keyof MusicPlayerUIProps, true>),
)

const splitProps = (
  props: MusicPlayerProps,
): { ui: MusicPlayerUIProps; options: Record<string, unknown> } => {
  const ui: Record<string, unknown> = {}
  const options: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (UI_PROP_KEYS.has(key)) {
      ui[key] = value
    } else {
      options[key] = value
    }
  }
  return { ui: ui as MusicPlayerUIProps, options }
}

/**
 * Full music-player component: a thin shell over {@link useMusicPlayer}
 * that composes the panel/controller/playlist/lyric UI. Renders nothing
 * server-side unless `container={null}`.
 */
export const MusicPlayer = (
  props: MusicPlayerProps & { ref?: Ref<MusicPlayerHandle> },
) => {
  const { ref, ...rest } = props
  const { ui: uiProps, options } = splitProps(
    rest as unknown as MusicPlayerProps,
  )
  // uiProps is rebuilt every render, so memoize on each key's value —
  // the dep list mirrors UI_PROP_KEYS order and `satisfies` above keeps
  // it exhaustive at compile time.
  const ui: PlayerContextValue['ui'] = useMemo(
    () => ({ ...DEFAULT_UI, ...uiProps }) as PlayerContextValue['ui'],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      uiProps.className,
      uiProps.style,
      uiProps.container,
      uiProps.locale,
      uiProps.icons,
      uiProps.draggable,
      uiProps.dragBounds,
      uiProps.defaultPosition,
      uiProps.allowModeToggle,
      uiProps.responsive,
      uiProps.seekable,
      uiProps.glassBackground,
      uiProps.hideEmptyCover,
      uiProps.showMiniCover,
      uiProps.showMiniProgress,
      uiProps.showBuffered,
      uiProps.showPlayButton,
      uiProps.showReload,
      uiProps.showDownload,
      uiProps.showPlayMode,
      uiProps.showThemeSwitch,
      uiProps.showLyric,
      uiProps.showDestroy,
      uiProps.removable,
      uiProps.sortable,
      uiProps.keyboardShortcuts,
      uiProps.playModeTipDuration,
      uiProps.extraControls,
      uiProps.lyricClassName,
      uiProps.renderTrackTitle,
      uiProps.onCoverClick,
      uiProps.onPlaylistToggle,
      uiProps.onBeforeDestroy,
      uiProps.onDestroyed,
    ],
  )

  const { state, actions, audioRef, audioProps } = useMusicPlayer({
    ...options,
    defaultMode:
      (options.defaultMode as MusicPlayerProps['defaultMode']) ?? 'mini',
  } as MusicPlayerProps)

  const locale = useMemo(() => resolveLocale(uiProps.locale), [uiProps.locale])
  const icons = useMemo(
    () => ({ ...defaultIcons, ...uiProps.icons }),
    [uiProps.icons],
  )
  const rootRef = useRef<HTMLDivElement | null>(null)
  const playlistId = useId()
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [lyricVisible, setLyricVisible] = useState(false)
  const [destroyed, setDestroyed] = useState(false)
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null)

  // portal container resolution (SSR-safe): resolve once in an effect
  // so nothing renders on the server; queue a microtask to avoid a
  // synchronous setState inside the effect body.
  const container = uiProps.container
  useEffect(() => {
    if (container === null) return undefined
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setContainerEl(
        typeof container === 'function'
          ? container()
          : (container ?? document.body),
      )
    })
    return () => {
      cancelled = true
    }
  }, [container])

  const isMobileLayout = state.isMobile && ui.responsive
  const layout = isMobileLayout ? 'mobile' : 'desktop'

  // When a full-mode panel closes, move focus to the (newly remounted)
  // mini button if nothing else holds it.
  const prevMode = useRef(state.mode)
  useEffect(() => {
    const wasFull = prevMode.current === 'full'
    prevMode.current = state.mode
    if (wasFull && state.mode === 'mini') {
      const active = document.activeElement
      const focusIsFree =
        !active || active === document.body || rootRef.current?.contains(active)
      if (focusIsFree) {
        rootRef.current
          ?.querySelector<HTMLElement>('.trmp-mini button')
          ?.focus()
      }
    }
  }, [state.mode])

  const togglePlaylist = useCallback(() => {
    const next = !playlistOpen
    setPlaylistOpen(next)
    uiProps.onPlaylistToggle?.(next)
  }, [playlistOpen, uiProps])

  const toggleLyric = useCallback(() => {
    setLyricVisible((v) => !v)
  }, [])

  const closePlaylist = useCallback(() => {
    setPlaylistOpen(false)
    uiProps.onPlaylistToggle?.(false)
  }, [uiProps])

  const destroy = useCallback(async () => {
    const info = actions.getAudioInfo()
    try {
      const verdict = await uiProps.onBeforeDestroy?.(info)
      if (verdict === false) return
    } catch (error) {
      // A rejected onBeforeDestroy cancels the destroy.
      console.warn(
        '[music-player] destroy cancelled by onBeforeDestroy:',
        error,
      )
      return
    }
    actions.pause()
    setDestroyed(true)
    uiProps.onDestroyed?.(info)
  }, [actions, uiProps])

  useImperativeHandle(
    ref,
    () => ({
      ...actions,
      get audio() {
        return audioRef.current
      },
      destroy: () => void destroy(),
    }),
    [actions, audioRef, destroy],
  )

  useKeyboardShortcuts(
    rootRef,
    {
      togglePlay: actions.togglePlay,
      seekBy: actions.seekBy,
      volumeBy: actions.volumeBy,
      toggleMute: actions.toggleMute,
      next: actions.next,
      prev: actions.prev,
    },
    ui.keyboardShortcuts,
  )

  const context: PlayerContextValue = useMemo(
    () => ({ state, actions, locale, icons, ui }),
    [state, actions, locale, icons, ui],
  )

  if (destroyed) return null

  const titleText = [
    reactNodeToText(state.track?.name),
    reactNodeToText(state.track?.singer),
  ]
    .filter(Boolean)
    .join(' - ')

  const tree = (
    <PlayerProvider value={context}>
      <div
        ref={rootRef}
        tabIndex={-1}
        className={classnames('trmp-root', uiProps.className)}
        style={uiProps.style}
        data-theme={state.resolvedTheme}
        data-mode={state.mode}
        data-layout={layout}
        data-status={state.status}
      >
        {state.mode === 'mini' ? (
          <MiniController onDestroy={destroy} />
        ) : isMobileLayout ? (
          <MobilePanel
            playlistOpen={playlistOpen}
            playlistId={playlistId}
            lyricVisible={lyricVisible}
            onTogglePlaylist={togglePlaylist}
            onToggleLyric={toggleLyric}
            onMinimize={actions.toggleMode}
            onDestroy={destroy}
          />
        ) : (
          <DesktopPanel
            playlistOpen={playlistOpen}
            playlistId={playlistId}
            lyricVisible={lyricVisible}
            onTogglePlaylist={togglePlaylist}
            onToggleLyric={toggleLyric}
            onMinimize={actions.toggleMode}
            onDestroy={destroy}
          />
        )}
        <PlaylistPanel
          id={playlistId}
          open={playlistOpen}
          onClose={closePlaylist}
        />
        {ui.showLyric && lyricVisible && <LyricOverlay />}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- music playback; captions are not applicable and lyrics are exposed via the aria-live lyric overlay */}
        <audio {...audioProps} title={titleText} className={styles.audio} />
      </div>
    </PlayerProvider>
  )

  if (container === null) return tree
  if (!containerEl) return null
  return createPortal(tree, containerEl)
}
