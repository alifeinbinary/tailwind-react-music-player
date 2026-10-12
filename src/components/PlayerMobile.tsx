import cls from 'classnames'
import React, { isValidElement, memo, type ReactNode } from 'react'
import {
  type TailwindReactMusicPlayerCustomLocale,
  type TailwindReactMusicPlayerIcon,
} from '../types'
import PlayModeTip from './PlayModeTip'

const prefix = 'tailwind-react-music-player-mobile'

export interface PlayerMobileProps {
  name: ReactNode
  cover?: string
  singer?: ReactNode
  playing: boolean
  duration: ReactNode
  currentTime: ReactNode
  loading: boolean
  themeSwitch: ReactNode
  progressBar: ReactNode
  openAudioListsPanel: () => void
  audioPrevPlay: () => void
  audioNextPlay: () => void
  playMode: ReactNode
  onClose: () => void
  playModeTipVisible?: boolean
  currentPlayModeName: ReactNode
  extendsContent?: ReactNode
  onPlay: () => void
  glassBg: boolean
  onCoverClick: () => void
  autoHiddenCover: boolean
  icon?: TailwindReactMusicPlayerIcon
  locale: TailwindReactMusicPlayerCustomLocale
  toggleMode: boolean
  renderAudioTitle?: () => ReactNode
  shouldShowPlayIcon: boolean
  isResetCoverRotate: boolean
}

const PlayerMobile: React.FC<PlayerMobileProps> = ({
  name,
  cover,
  singer,
  playing,
  duration,
  currentTime,
  loading,
  themeSwitch,
  progressBar,
  openAudioListsPanel,
  audioPrevPlay,
  audioNextPlay,
  playMode,
  onClose,
  playModeTipVisible,
  currentPlayModeName,
  extendsContent,
  onPlay,
  glassBg,
  onCoverClick,
  autoHiddenCover,
  icon = {},
  locale,
  toggleMode,
  renderAudioTitle = () => null,
  shouldShowPlayIcon,
  isResetCoverRotate,
}: PlayerMobileProps) => (
  <div
    className={cls(
      prefix,
      'w-full fixed z-999 inset-0 p-5 text-white flex flex-col justify-between bg-(--rjmp-panel-bg-mobile) overflow-hidden [&>.group]:flex-auto',
      {
        'default-bg': !glassBg,
        'glass-bg backdrop-blur-[10px]': glassBg,
      },
    )}
  >
    <PlayModeTip
      prefix={prefix}
      visible={playModeTipVisible}
      title={playMode}
      text={currentPlayModeName}
    />
    <div
      className={`${prefix}-header group w-full flex justify-center items-center animate-[fromDown_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards] relative`}
    >
      <div
        className={`${prefix}-header-title text-center text-[20px] transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type) px-7.5 truncate`}
        title={name as string}
      >
        {renderAudioTitle()}
      </div>
      {toggleMode && (
        <div
          className={`${prefix}-header-right text-(--rjmp-base-color) cursor-pointer absolute right-0 [&_svg]:text-[25px]`}
          onClick={onClose}
        >
          {icon.close}
        </div>
      )}
    </div>
    <div
      className={`${prefix}-singer text-center group animate-[fromDown_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards] py-3 [@media_(max-width:320px)]:p-0`}
    >
      <span
        className={`${prefix}-singer-name relative text-sm transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type)`}
        title={singer as string}
      >
        {singer}
      </span>
    </div>
    <div
      className={`${prefix}-switch text-center group animate-[fromDown_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]`}
    >
      {themeSwitch}
    </div>
    {/* lgtm [js/trivial-conditional] */}
    {(!autoHiddenCover || (autoHiddenCover && cover)) && (
      <div
        className={`${prefix}-cover text-center w-75 h-75 rounded-[50%] border-[5px] border-black/20 shadow-[0_0_1px_3px_rgba(0,0,0,0.1)] my-3.75 mx-auto animate-[fromTo_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards] overflow-hidden [transition:box-shadow,border_var(--rjmp-animate-time)_var(--rjmp-animate-type)] [@media_(max-width:320px)]:w-57.5 [@media_(max-width:320px)]:h-57.5 [@media_(max-width:320px)]:my-2.5`}
        onClick={() => onCoverClick()}
      >
        <img
          src={cover}
          alt="cover"
          className={cls(
            'cover img-rotate w-full animate-[imgRotate_30s_linear_infinite] object-cover',
            {
              'img-rotate-pause [animation-play-state:paused]!':
                !playing || !cover,
              'img-rotate-reset animate-[coverReset_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]!':
                isResetCoverRotate,
            },
          )}
        />
      </div>
    )}
    <div
      className={`${prefix}-progress group justify-around flex items-center animate-[fromTo_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]`}
    >
      <span className="current-time inline-flex w-13.75 text-xs text-(--rjmp-base-color) transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type) mr-1.25">
        {loading ? '--' : currentTime}
      </span>
      <span className={`${prefix}-progress-bar relative flex w-full`}>
        {progressBar}
      </span>
      <span className="duration text-right inline-flex w-13.75 text-xs text-(--rjmp-base-color) transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type) justify-end ml-1.25">
        {loading ? '--' : duration}
      </span>
    </div>
    <div
      className={`${prefix}-toggle text-center group py-4.25 animate-[fromTo_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards] [&_.group]:cursor-pointer [&_.group_svg]:text-10 [@media_(max-width:320px)]:py-1 [@media_(max-width:320px)]:[&>.group_svg]:text-8`}
    >
      <span
        className="group prev-audio"
        title={locale.previousTrackText as string}
        onClick={audioPrevPlay}
      >
        {icon.prev}
      </span>
      {loading ? (
        <span className="group loading-icon px-10">{icon.loading}</span>
      ) : (
        <span
          className="group play-btn px-10 [&_svg]:text-11.25! [@media_(max-width:320px)]:[&_svg]:text-10!"
          title={
            shouldShowPlayIcon
              ? (locale.clickToPlayText as string)
              : (locale.clickToPauseText as string)
          }
          onClick={onPlay}
        >
          {shouldShowPlayIcon ? icon.play : icon.pause}
        </span>
      )}
      <span
        className="group next-audio"
        title={locale.nextTrackText as string}
        onClick={audioNextPlay}
      >
        {icon.next}
      </span>
    </div>
    <div
      className={`${prefix}-operation group animate-[fromTo_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]`}
    >
      <ul className="items flex justify-around items-center">
        {[playMode, icon.download, icon.reload, icon.lyric]
          .filter((item): item is React.ReactElement<{ className?: string }> =>
            isValidElement(item),
          )
          .map((item) => (
            <li
              className="item cursor-pointer flex-1 text-center [&_svg]:text-(--rjmp-base-color)"
              key={item.props.className}
            >
              {item}
            </li>
          ))}
        {extendsContent}
        <li
          className="item cursor-pointer flex-1 text-center [&_svg]:text-(--rjmp-base-color)"
          onClick={openAudioListsPanel}
        >
          {icon.playLists}
        </li>
      </ul>
    </div>
  </div>
)

export default memo(PlayerMobile)
