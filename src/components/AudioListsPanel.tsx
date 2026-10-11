import cls from 'classnames'
import React, { memo, MouseEvent } from 'react'
import { PLAYER_KEY } from '../config/player'
import SORTABLE_CONFIG from '../config/sortable'
import {
  ReactJkMusicPlayerAudioList,
  ReactJkMusicPlayerCustomLocale,
  ReactJkMusicPlayerIcon,
} from '../types'

interface PanelToggleAnimate {
  show?: boolean
  hide?: boolean
}

export interface AudioListsPanelProps {
  visible: boolean
  audioLists: ReactJkMusicPlayerAudioList[]
  onCancel: (e: MouseEvent) => void
  onDelete: (audioId?: string) => (e: MouseEvent) => void
  onPlay: (playId: string) => void
  playId: string
  loading: boolean
  panelToggleAnimate: PanelToggleAnimate
  glassBg: boolean
  remove: boolean
  removeId: string | number
  isMobile: boolean
  locale: ReactJkMusicPlayerCustomLocale
  icon: ReactJkMusicPlayerIcon
  playing: boolean
  cover?: string
}

const AudioListsPanel = ({
  audioLists,
  onCancel,
  onDelete,
  onPlay,
  playId,
  loading,
  panelToggleAnimate,
  glassBg,
  remove,
  removeId,
  isMobile,
  locale,
  icon,
  playing,
}: AudioListsPanelProps) => (
  <div
    className={cls(
      'audio-lists-panel overflow-hidden fixed right-8.25 bottom-(--rjmp-panel-height) z-999 w-(--rjmp-lists-panel-width) h-(--rjmp-lists-panel-height) text-white/80 origin-bottom-right bg-(--rjmp-panel-bg) transform-[scale(0)] transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type) rounded-t-(--rjmp-panel-border-radius)',
      panelToggleAnimate,
      {
        'audio-lists-panel-mobile w-full! inset-0! h-auto! origin-bottom! bg-(--rjmp-panel-bg-mobile) rounded-none!': isMobile,
        'glass-bg backdrop-blur-[10px]': glassBg,
        'animate-[scaleTo_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]':
          panelToggleAnimate.show && !isMobile,
        'animate-[scaleFrom_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]':
          panelToggleAnimate.hide && !isMobile,
        'animate-[fromTo_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]':
          panelToggleAnimate.show && isMobile,
        'animate-[fromOut_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]':
          panelToggleAnimate.hide && isMobile,
      },
    )}
  >
    <div className="audio-lists-panel-header [border-bottom:1px_solid_color-mix(in_srgb,var(--rjmp-panel-bg)_99%,#fff)] shadow-[0_1px_2px_rgba(0,0,0,0.2)] [text-shadow:0_1px_1px_rgba(0,0,0,0.1)] [transition:background-color,border-bottom_var(--rjmp-animate-time)_var(--rjmp-animate-type)]">
      <h2 className="audio-lists-panel-header-title h-(--rjmp-panel-header-height) flex items-center px-5 text-base m-0 text-left font-medium transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type)">
        <span>{locale.playListsText} / </span>
        <span className="audio-lists-panel-header-num ml-2.5">
          {audioLists.length}
        </span>
        <span className="audio-lists-panel-header-actions flex grow justify-end items-center">
          {remove && (
            <>
              <span
                className="audio-lists-panel-header-delete-btn flex cursor-pointer [&_svg]:text-[21px] max-md:[&_svg]:text-[19px]"
                title={locale.removeAudioListsText as string}
                onClick={onDelete()}
              >
                {icon.delete}
              </span>
              <span className="audio-lists-panel-header-line w-px bg-white h-5 mx-2.5" />
            </>
          )}
          <span
            className="audio-lists-panel-header-close-btn flex cursor-pointer md:[&:hover_svg]:animate-[imgRotate_var(--rjmp-animate-time)_var(--rjmp-animate-type)]"
            title={locale.closeText as string}
            onClick={onCancel}
          >
            {isMobile ? icon.packUpPanelMobile : icon.close}
          </span>
        </span>
      </h2>
    </div>
    <div
      className={cls(
        'audio-lists-panel-content overflow-x-hidden overflow-y-auto h-[calc(var(--rjmp-lists-panel-height)-var(--rjmp-panel-header-height)-1px)]',
        {
          'no-content flex items-center justify-center [&>span]:flex':
            audioLists.length < 1,
          'w-full! h-[calc(100vh-var(--rjmp-panel-header-height))]! origin-bottom [-webkit-overflow-scrolling:touch]': isMobile,
        },
      )}
    >
      {audioLists.length >= 1 ? (
        <ul className={SORTABLE_CONFIG.selector}>
          {audioLists.map((audio) => {
            const { name, singer } = audio
            const audioId = audio[PLAYER_KEY]
            const isCurrentPlaying = playId === audioId
            return (
              <li
                key={audioId}
                title={
                  !playing
                    ? (locale.clickToPlayText as string)
                    : isCurrentPlaying
                    ? (locale.clickToPauseText as string)
                    : (locale.clickToPlayText as string)
                }
                className={cls(
                  'audio-item border-b border-b-transparent px-5 py-0.75 leading-10 flex justify-between items-center text-sm cursor-pointer transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type) odd:bg-(--rjmp-lists-item-bg) hover:bg-(--rjmp-lists-item-bg-active)! active:bg-(--rjmp-lists-item-bg-active)! [&:is(:hover,:active)_.group_svg]:text-(--rjmp-primary-color)',
                  {
                    'playing bg-(--rjmp-lists-item-bg-playing)! text-(--rjmp-primary-color) [&_svg]:text-(--rjmp-primary-color)': isCurrentPlaying,
                    pause: !playing,
                    'remove animate-[remove_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]':
                      removeId === audioId,
                  },
                )}
                onClick={() => onPlay(audioId as string)}
              >
                <span className="group player-status inline-flex">
                  <span className="player-icons inline-flex w-7.5">
                    {isCurrentPlaying && loading
                      ? icon.loading
                      : isCurrentPlaying
                      ? playing
                        ? icon.pause
                        : icon.play
                      : undefined}
                  </span>
                </span>
                <span
                  className="group player-name inline-block flex-1 pr-5 pl-2.5 truncate transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type)"
                  title={name as string}
                >
                  {name}
                </span>
                <span
                  className="group player-singer inline-block text-xs w-21.25 truncate transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type)"
                  title={singer as string}
                >
                  {singer}
                </span>
                {remove && (
                  <span
                    className="group player-delete inline-flex w-7.5 text-right justify-end [&:hover_svg]:animate-[imgRotate_var(--rjmp-animate-time)_var(--rjmp-animate-type)]"
                    title={locale.clickToDeleteText(name) as string}
                    onClick={onDelete(audioId)}
                  >
                    {icon.close}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <>
          <span>{icon.empty}</span>
          <span className="no-data ml-2.5">
            {locale.emptyText || locale.notContentText}
          </span>
        </>
      )}
    </div>
  </div>
)

export default memo(AudioListsPanel)
