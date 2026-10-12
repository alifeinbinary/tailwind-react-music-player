import classnames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TIMING } from '../constants'
import { useSortable } from '../hooks/use-sortable'
import type { PlaylistItem } from '../types'
import { IconButton, reactNodeToText } from './controls'
import { usePlayerContext } from './player-context'

const styles = {
  root: 'trmp:fixed trmp:right-0 trmp:top-0 trmp:z-50 trmp:flex trmp:h-playlist-h trmp:w-playlist-w trmp:max-w-full trmp:flex-col trmp:bg-panel trmp:text-panel-text trmp:shadow-panel trmp:animate-slide-in-right trmp:data-[open=false]:hidden',
  header:
    'trmp:flex trmp:h-panel-header trmp:items-center trmp:justify-between trmp:border-b trmp:border-panel-muted trmp:px-4',
  list: 'trmp:flex-1 trmp:overflow-y-auto',
  item: 'trmp:flex trmp:w-full trmp:items-center trmp:bg-list-item trmp:data-[removing]:animate-remove',
  itemButton:
    'trmp:flex trmp:min-w-0 trmp:flex-1 trmp:items-center trmp:gap-2 trmp:px-3 trmp:py-2 trmp:text-left trmp:hover:bg-list-item-active trmp:data-[current]:bg-list-item-playing trmp:data-[current]:text-primary',
  name: 'trmp:truncate',
  singer: 'trmp:truncate trmp:text-panel-muted trmp:text-[12px]',
  statusIcon: 'trmp:text-primary',
  remove: 'trmp:mr-1 trmp:shrink-0',
  empty:
    'trmp:flex trmp:flex-1 trmp:flex-col trmp:items-center trmp:justify-center trmp:gap-2 trmp:text-panel-muted',
  hidden:
    'trmp:absolute trmp:size-px trmp:overflow-hidden trmp:whitespace-nowrap trmp:clip-path-[inset(50%)]',
}

/** Track-list dialog with removal, clear-all and optional sorting. */
export function PlaylistPanel({
  id,
  open,
  onClose,
}: {
  id: string
  open: boolean
  onClose(): void
}) {
  const { state, actions, locale, icons, ui } = usePlayerContext()
  const listRef = useRef<HTMLUListElement | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)
  const [removingIds, setRemovingIds] = useState<readonly string[]>([])
  const hintId = `${id}-hint`

  useSortable(listRef, {
    enabled: open && !!ui.sortable && state.tracks.length > 1,
    options: typeof ui.sortable === 'object' ? ui.sortable : undefined,
    onSortEnd: actions.reorderTracks,
  })

  // Escape closes
  useEffect(() => {
    const el = rootRef.current
    if (!open || !el) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Alt+Arrow reorder fallback with focus preservation
  const onItemKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (!e.altKey) return
      const to =
        e.key === 'ArrowUp'
          ? index - 1
          : e.key === 'ArrowDown'
            ? index + 1
            : index
      if (to === index || to < 0 || to >= state.tracks.length) return
      e.preventDefault()
      actions.reorderTracks(index, to)
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelectorAll<HTMLElement>('[data-track-index]')
          [to]?.focus()
      })
    },
    [actions, state.tracks.length],
  )

  const removeTrack = useCallback(
    (track: PlaylistItem) => {
      setRemovingIds((ids) => [...ids, track.id])
      setTimeout(() => {
        actions.removeTrack(track.id)
        setRemovingIds((ids) => ids.filter((i) => i !== track.id))
      }, TIMING.REMOVE_ANIMATION_MS)
    },
    [actions],
  )

  const statusIcon = (track: PlaylistItem) => {
    if (state.track?.id !== track.id) return null
    if (state.status === 'loading') return icons.loading
    if (state.status === 'playing') return icons.volume
    return icons.play
  }

  return (
    <section
      ref={rootRef}
      id={id}
      role="dialog"
      aria-label={locale.playlist}
      data-open={open}
      hidden={!open}
      className={styles.root}
    >
      <div className={styles.header}>
        <span>{locale.playlistCount(state.tracks.length)}</span>
        <div className="trmp:flex trmp:items-center">
          {ui.removable && state.tracks.length > 0 && (
            <IconButton
              label={locale.clearPlaylist}
              size="sm"
              onClick={actions.clearTracks}
            >
              {icons.delete}
            </IconButton>
          )}
          <IconButton label={locale.close} size="sm" onClick={onClose}>
            {icons.close}
          </IconButton>
        </div>
      </div>

      <span id={hintId} className={styles.hidden}>
        {locale.reorderHint}
      </span>

      {state.tracks.length === 0 ? (
        <div className={styles.empty}>
          <span aria-hidden="true" className="trmp:text-3xl">
            {icons.empty}
          </span>
          {locale.emptyPlaylist}
        </div>
      ) : (
        <ul ref={listRef} className={styles.list}>
          {state.tracks.map((track, i) => (
            <li
              key={track.id}
              className={styles.item}
              data-removing={removingIds.includes(track.id) || undefined}
            >
              <button
                type="button"
                data-track-index={i}
                data-current={state.track?.id === track.id || undefined}
                aria-current={state.track?.id === track.id ? 'true' : undefined}
                aria-describedby={hintId}
                className={classnames(styles.itemButton)}
                onClick={() => actions.playId(track.id)}
                onKeyDown={(e) => onItemKeyDown(e, i)}
              >
                <span className={styles.statusIcon} aria-hidden="true">
                  {statusIcon(track)}
                </span>
                <span className={styles.name}>{track.name}</span>
                <span className={styles.singer}>{track.singer}</span>
              </button>
              {ui.removable && (
                <IconButton
                  label={locale.removeTrack(reactNodeToText(track.name))}
                  size="sm"
                  className={styles.remove}
                  onClick={() => removeTrack(track)}
                >
                  {icons.delete}
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
