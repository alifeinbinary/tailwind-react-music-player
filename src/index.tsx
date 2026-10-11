/**
 * @name react-jinke-music-player
 * @description Maybe the best beautiful HTML5 responsive player component for react :)
 * @author Jinke.Li <1359518268@qq.com>
 * @license MIT
 */

import cls from 'classnames'
import download from 'downloadjs'
import getIsMobile from 'is-mobile'
import Slider from 'rc-slider/lib/Slider'
import Switch from 'rc-switch'
import React, {
  cloneElement,
  createRef,
  MouseEvent,
  PureComponent,
  ReactElement,
  ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable'
import Sortable, { Swap } from 'sortablejs'
import AudioListsPanel from './components/AudioListsPanel'
import CircleProcessBar from './components/CircleProcessBar'
import {
  AnimatePauseIcon,
  AnimatePlayIcon,
  ArrowDownIcon,
  CloseIcon,
  DeleteIcon,
  DownloadIcon,
  EmptyIcon,
  FaMinusSquareOIcon,
  LoadIcon,
  LoopIcon,
  LyricIcon,
  NextAudioIcon,
  OrderPlayIcon,
  PlayListsIcon,
  PrevAudioIcon,
  ReloadIcon,
  RepeatIcon,
  ShufflePlayIcon,
  VolumeMuteIcon,
  VolumeUnmuteIcon,
} from './components/Icon'
import AudioPlayerMobile from './components/PlayerMobile'
import PlayModel from './components/PlayModel'
import { AUDIO_LIST_REMOVE_ANIMATE_TIME } from './config/animate'
import { SPACE_BAR_KEYCODE } from './config/keycode'
import LOCALE from './config/locale'
import { MEDIA_QUERY } from './config/mediaQuery'
import { MODE } from './config/mode'
import { AUDIO_NETWORK_STATE, AUDIO_READY_STATE } from './config/audioState'
import PLAY_MODE from './config/playMode'
import PROP_TYPES from './config/propTypes'
import {
  PROGRESS_BAR_SLIDER_OPTIONS,
  VOLUME_BAR_SLIDER_OPTIONS,
} from './config/slider'
import { THEME } from './config/theme'
import { VOLUME_FADE } from './config/volumeFade'
import {
  DEFAULT_PLAY_INDEX,
  DEFAULT_VOLUME,
  DEFAULT_REMOVE_ID,
  PLAYER_KEY,
} from './config/player'
import SORTABLE_CONFIG from './config/sortable'
import LOCALE_CONFIG from './locale'
import Lyric, { LyricHandlerParams } from './lyric'
import {
  ReactJkMusicPlayerAudioInfo,
  ReactJkMusicPlayerAudioList,
  ReactJkMusicPlayerCustomLocale,
  ReactJkMusicPlayerInstance,
  ReactJkMusicPlayerMode,
  ReactJkMusicPlayerPlayMode,
  ReactJkMusicPlayerProps,
  ReactJkMusicPlayerState,
  ReactJkMusicPlayerTheme,
  TransformedDownloadAudioInfo,
} from './types'
import {
  adjustVolume,
  arrayEqual,
  createRandomNum,
  formatTime,
  isSafari,
  uuId,
} from './utils'

export * from './types'

Sortable.mount(new Swap())

const IS_MOBILE = getIsMobile()

const DEFAULT_ICON: Record<string, ReactNode> = {
  pause: <AnimatePauseIcon />,
  play: <AnimatePlayIcon />,
  destroy: <CloseIcon />,
  close: <CloseIcon />,
  delete: <DeleteIcon size={24} />,
  download: <DownloadIcon size={26} />,
  toggle: <FaMinusSquareOIcon />,
  lyric: <LyricIcon />,
  volume: <VolumeUnmuteIcon size={26} />,
  mute: <VolumeMuteIcon size={26} />,
  next: <NextAudioIcon />,
  prev: <PrevAudioIcon />,
  playLists: <PlayListsIcon />,
  reload: <ReloadIcon size={22} />,
  loop: <LoopIcon size={26} />,
  order: <OrderPlayIcon size={26} />,
  orderLoop: <RepeatIcon size={26} />,
  shuffle: <ShufflePlayIcon size={26} />,
  loading: <LoadIcon />,
  packUpPanelMobile: <ArrowDownIcon size={26} />,
  empty: <EmptyIcon />,
}

const PLAYER_CONTENT_GROUP_CLASS =
  'group cursor-pointer text-center flex-1 mx-2.5 max-md:mx-1.5 [@media_(max-width:320px)]:mx-1 inline-flex items-center justify-center [&>svg]:cursor-pointer'

// The icon components (download, reload, lyric, play-mode, theme-switch)
// render in both the desktop panel (.player-content) and the mobile
// player — scope the shared button styles to the panel context.
const PLAYER_CONTENT_SCOPED_GROUP_CLASS =
  'group [.player-content_&]:cursor-pointer [.player-content_&]:text-center [.player-content_&]:flex-1 [.player-content_&]:mx-2.5 max-md:[.player-content_&]:mx-1.5 [@media_(max-width:320px)]:[.player-content_&]:mx-1 [.player-content_&]:inline-flex [.player-content_&]:items-center [.player-content_&]:justify-center [.player-content_&>svg]:cursor-pointer'

type ResolvedProps = Required<ReactJkMusicPlayerProps>

const defaultProps: Partial<ReactJkMusicPlayerProps> = {
  audioLists: [],
  theme: THEME.DARK,
  mode: MODE.MINI,
  defaultPlayMode: PLAY_MODE.order,
  defaultPosition: {
    left: 0,
    top: 0,
  },
  once: false, // Indicates whether the onAudioPlay event should fire only once.
  drag: true,
  toggleMode: true, // Indicates whether to allow switching between mini and full modes.
  showMiniModeCover: true, // Indicates whether to show the cover image in mini mode.
  showDownload: true,
  showPlay: true,
  showReload: true,
  showPlayMode: true,
  showThemeSwitch: true,
  showLyric: false,
  playModeTipVisible: false, // Indicates whether to show the play mode tip on mobile.
  autoPlay: true,
  defaultVolume: 1,
  showProgressLoadBar: true, // Indicates whether to show the audio preload progress.
  seeked: true,
  playModeShowTime: 600, // Indicates how long the play mode tip should be displayed.
  bounds: 'body', // Indicates the draggable boundary for mini mode.
  showMiniProcessBar: false, // Indicates whether to show the progress bar in mini mode.
  loadAudioErrorPlayNext: true, // Indicates whether to try playing the next song when audio loading fails.
  preload: false, // Indicates whether to preload audio when the page loads.
  glassBg: false, // Indicates whether to use a frosted glass effect.
  remember: false, // Indicates whether to remember the current playback state.
  remove: true, // Indicates whether music can be deleted.
  defaultPlayIndex: 0, // Default play index.
  getContainer: () => document.body, // The node where the player is mounted.
  autoHiddenCover: false, // Indicates whether to automatically hide the cover when the current song has no cover.
  onBeforeAudioDownload: () => {}, // Convert audio addresses before downloading.
  spaceBar: false, // Indicates whether to control play/pause with the spacebar.
  showDestroy: false,
  showMediaSession: false,
  locale: LOCALE.en_US,
  responsive: true,
  icon: DEFAULT_ICON,
  quietUpdate: false, // Indicates whether to not interrupt the current playback state when the updated playlist contains the currently playing song.
  mobileMediaQuery: MEDIA_QUERY.MOBILE,
  // Audio pause play fade in fade out
  volumeFade: {
    fadeIn: 0,
    fadeOut: 0,
  },
  restartCurrentOnPrev: false,
  // https://github.com/SortableJS/Sortable#options
  sortableOptions: {},
}

export default class ReactJkMusicPlayer extends PureComponent<
  ReactJkMusicPlayerProps,
  ReactJkMusicPlayerState
> {
  // this.props is fully resolved: every prop has a default (defaultProps
  // below) or is required, so internally nothing is undefined.
  declare props: ResolvedProps

  isDrag = false

  initPlayId = '' // 初始播放id

  audio!: HTMLAudioElement

  lyric?: Lyric

  sortable?: Sortable

  player: React.RefObject<HTMLDivElement>

  destroyBtn: React.RefObject<HTMLSpanElement>

  targetId: string

  mobileMedia?: MediaQueryList

  systemThemeMedia?: MediaQueryList

  playModelTimer?: ReturnType<typeof setTimeout>

  defaultVolume = DEFAULT_VOLUME

  private _PLAY_MODE_: ReactJkMusicPlayerPlayMode[]

  private _PLAY_MODE_LENGTH_: number

  state: ReactJkMusicPlayerState = {
    audioLists: [],
    playId: this.initPlayId, // The ID of the currently playing song.
    name: '', // The name of the current song.
    cover: '', // The cover image of the current song.
    singer: '', // The singer of the current song.
    musicSrc: '', // The source URL of the current song.
    lyric: '', // The lyrics of the current song.
    currentLyric: '',
    isMobile: IS_MOBILE,
    toggle: this.props.mode === MODE.FULL,
    playing: false,
    currentTime: 0,
    soundValue: DEFAULT_VOLUME,
    moveX: 0,
    moveY: 0,
    loading: false,
    audioListsPanelVisible: false,
    playModelNameVisible: false,
    theme: this.props.theme || THEME.DARK,
    playMode: this.props.playMode || this.props.defaultPlayMode || '', // The current playback mode.
    currentAudioVolume: 0, // The current volume. Restores to the previously recorded volume after muting.
    initAnimate: false,
    isInitAutoPlay: this.props.autoPlay,
    isInitRemember: false,
    loadedProgress: 0,
    removeId: DEFAULT_REMOVE_ID,
    isNeedMobileHack: IS_MOBILE,
    audioLyricVisible: false,
    isAutoPlayWhenUserClicked: false,
    playIndex:
      this.props.playIndex || this.props.defaultPlayIndex || DEFAULT_PLAY_INDEX,
    canPlay: false,
    currentVolumeFade: VOLUME_FADE.NONE,
    currentVolumeFadeInterval: undefined,
    updateIntervalEndVolume: undefined,
    isAudioSeeking: false,
    isResetCoverRotate: false,
  }

  static defaultProps = defaultProps

  static propTypes = PROP_TYPES

  static locale = LOCALE

  get locale(): ReactJkMusicPlayerCustomLocale {
    const { locale } = this.props
    if (typeof locale === 'string') {
      return LOCALE_CONFIG[locale]
    }
    return locale
      ? { ...LOCALE_CONFIG[LOCALE.en_US], ...locale }
      : ({} as ReactJkMusicPlayerCustomLocale)
  }

  get audioDuration() {
    const { audioLists, playId } = this.state
    if (!audioLists.length || !this.audio) {
      return 0
    }
    const { duration } = (audioLists.find(
      (audio) => audio[PLAYER_KEY] === playId,
    ) || {}) as ReactJkMusicPlayerAudioList

    return Math.max(Number(duration) || this.audio.duration || 0, 0)
  }

  get isAudioCanPlay() {
    const { autoPlay } = this.props
    const { isInitAutoPlay, isAutoPlayWhenUserClicked, canPlay } = this.state
    return !!(
      canPlay &&
      (isInitAutoPlay || autoPlay || isAutoPlayWhenUserClicked)
    )
  }

  get iconMap(): Record<string, ReactNode> {
    const Spin = () => (
      <span className="loading group inline-flex animate-[audioLoading_1s_linear_infinite] [&_svg]:text-[24px] [&_svg]:text-(--rjmp-primary-color)">
        {this.props.icon.loading}
      </span>
    )
    return { ...DEFAULT_ICON, ...this.props.icon, loading: <Spin /> }
  }

  constructor(props: ReactJkMusicPlayerProps) {
    super(props)

    this.audio = (null as unknown) as HTMLAudioElement
    this.targetId = 'music-player-controller'

    this._PLAY_MODE_ = Object.values(PLAY_MODE)
    this._PLAY_MODE_LENGTH_ = this._PLAY_MODE_.length

    this.player = createRef()
    this.destroyBtn = createRef()
  }

  render() {
    const {
      className,
      drag,
      style,
      showDownload,
      showPlay,
      showReload,
      showPlayMode,
      showThemeSwitch,
      toggleMode,
      showMiniModeCover,
      extendsContent,
      defaultPlayMode,
      seeked,
      showProgressLoadBar,
      bounds,
      defaultPosition,
      showMiniProcessBar,
      preload,
      glassBg,
      remove,
      lyricClassName,
      showLyric,
      getContainer,
      autoHiddenCover,
      showDestroy,
      responsive,
    } = this.props

    const { locale } = this

    const {
      toggle,
      playing,
      currentTime,
      soundValue,
      moveX,
      moveY,
      loading,
      audioListsPanelVisible,
      theme,
      name,
      cover,
      singer,
      musicSrc,
      playId,
      isMobile,
      playMode,
      playModeTipVisible,
      playModelNameVisible,
      initAnimate,
      loadedProgress,
      audioLists,
      removeId,
      currentLyric,
      audioLyricVisible,
      isPlayDestroyed,
      isResetCoverRotate,
    } = this.state

    const preloadState =
      preload === false || preload === 'none'
        ? {}
        : preload === true
        ? { preload: 'auto' }
        : { preload }

    const panelToggleAnimate: { show: boolean; hide?: boolean } = initAnimate
      ? { show: audioListsPanelVisible, hide: !audioListsPanelVisible }
      : { show: audioListsPanelVisible }

    const currentPlayMode =
      PLAY_MODE[playMode || defaultPlayMode] || PLAY_MODE.order
    const currentPlayModeName = locale.playModeText[currentPlayMode]

    const miniModeCoverConfig =
      (showMiniModeCover && !autoHiddenCover) || (autoHiddenCover && cover)
        ? {
            style: {
              backgroundImage: `url(${cover})`,
            },
          }
        : {}

    const formattedCurrentTime = formatTime(currentTime)
    const formattedAudioDuration = formatTime(this.audioDuration)

    const progressHandler = seeked
      ? {
          onChange: this.onProgressChange,
          onAfterChange: this.onAudioSeeked,
        }
      : {}

    const ProgressBar = (
      <>
        {showProgressLoadBar && (
          <div
            className="progress-load-bar absolute w-0 h-[calc(var(--rjmp-progress-bar-height)-1px)] [transition:width,background-color_var(--rjmp-animate-time)_var(--rjmp-animate-type)] left-0 top-1.25 z-77"
            style={{ width: `${Math.min(loadedProgress, 100)}%` }}
          />
        )}
        <Slider
          max={Math.ceil(this.audioDuration)}
          defaultValue={0}
          value={Math.ceil(currentTime)}
          {...progressHandler}
          {...PROGRESS_BAR_SLIDER_OPTIONS}
        />
      </>
    )

    const DownloadComponent = showDownload && (
      <span
        className={cls(PLAYER_CONTENT_SCOPED_GROUP_CLASS, 'audio-download')}
        onClick={this.onAudioDownload}
        title={locale.downloadText as string}
      >
        {this.iconMap.download}
      </span>
    )

    const ThemeSwitchComponent = showThemeSwitch && (
      <span
        className={cls(
          PLAYER_CONTENT_SCOPED_GROUP_CLASS,
          'theme-switch [.player-content_&_.rc-switch]:bg-transparent',
        )}
      >
        <Switch
          className="theme-switch-container"
          onChange={this.themeChange}
          checkedChildren={locale.lightThemeText}
          unCheckedChildren={locale.darkThemeText}
          checked={theme === THEME.LIGHT}
          title={locale.switchThemeText as string}
        />
      </span>
    )

    const ReloadComponent = showReload && (
      <span
        className={cls(PLAYER_CONTENT_SCOPED_GROUP_CLASS, 'reload-btn')}
        onClick={this.onAudioReload}
        title={locale.reloadText as string}
      >
        {this.iconMap.reload}
      </span>
    )

    const LyricComponent = showLyric && (
      <span
        className={cls(
          PLAYER_CONTENT_SCOPED_GROUP_CLASS,
          'lyric-btn [&_svg]:text-[20px]',
          {
            'lyric-btn-active text-(--rjmp-primary-color)! [&_svg]:text-(--rjmp-primary-color)!': audioLyricVisible,
          },
        )}
        onClick={this.toggleAudioLyric}
        title={locale.toggleLyricText as string}
      >
        {this.iconMap.lyric}
      </span>
    )

    const PlayModeComponent = showPlayMode && (
      <span
        className={cls(PLAYER_CONTENT_SCOPED_GROUP_CLASS, 'loop-btn')}
        onClick={this.togglePlayMode}
        title={locale.playModeText[currentPlayMode] as string}
      >
        {this.renderPlayModeIcon(currentPlayMode)}
      </span>
    )

    const miniProcessBarR = isMobile ? 30 : 40

    const DestroyComponent = showDestroy && (
      <span
        title={locale.destroyText as string}
        className="group destroy-btn"
        ref={this.destroyBtn}
        onClick={!drag || toggle ? this.onDestroyPlayer : undefined}
      >
        {this.iconMap.destroy}
      </span>
    )

    const AudioController = (
      <div
        className={cls(
          'react-jinke-music-player',
          'fixed w-(--rjmp-player-size) h-(--rjmp-player-size) z-999 max-md:w-(--rjmp-player-size-mobile) max-md:h-(--rjmp-player-size-mobile) focus:outline-none',
        )}
        style={defaultPosition}
        tabIndex={-1}
      >
        <div
          className={cls(
            'music-player',
            'cursor-pointer relative w-(--rjmp-player-size) h-(--rjmp-player-size) max-md:w-(--rjmp-player-size-mobile) max-md:h-(--rjmp-player-size-mobile) focus:outline-none',
          )}
        >
          {showMiniProcessBar && (
            <CircleProcessBar
              progress={currentTime / this.audioDuration}
              r={miniProcessBarR}
            />
          )}
          <div
            id={this.targetId}
            className={cls(
              'music-player-controller group',
              'w-(--rjmp-player-size) h-(--rjmp-player-size) rounded-[50%] border border-(--rjmp-controller-bg) bg-(--rjmp-controller-bg) text-(--rjmp-primary-color) shadow-[0_0_10px_rgba(0,0,0,0.15)] text-[20px] text-center transition-all duration-300 ease-(--rjmp-animate-type) z-99 p-2.5 fixed cursor-pointer bg-no-repeat bg-size-[100%] focus:outline-none flex items-center justify-center animate-[scaleTo_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards] active:shadow-[0_0_30px_rgba(0,0,0,0.2)] hover:text-[16px] [&_i]:text-[28px]',
              'max-md:w-(--rjmp-player-size-mobile) max-md:h-(--rjmp-player-size-mobile) max-md:hover:text-[12px] max-md:active:text-[12px] max-md:[&_i]:text-[20px]',
              {
                'music-player-playing': playing,
              },
            )}
            {...miniModeCoverConfig}
            onClick={!drag ? this.onOpenPanel : undefined}
          >
            {loading ? (
              this.iconMap.loading
            ) : (
              <>
                <span className="controller-title text-sm">
                  {locale.controllerTitle}
                </span>
                <div className="music-player-controller-setting w-full h-full scale-0 group-hover:scale-100 group-active:scale-100 rounded-[50%] transition-all duration-400 ease-(--rjmp-animate-type) text-white absolute left-0 top-0 flex items-center justify-center [background:color-mix(in_srgb,var(--rjmp-primary-color)_30%,transparent)]">
                  {toggle ? locale.closeText : locale.openText}
                </div>
              </>
            )}
          </div>
          {DestroyComponent}
        </div>
      </div>
    )

    const container = getContainer() || document.body
    const audioTitle = this.getAudioTitle() as string

    if (isPlayDestroyed) {
      return null
    }

    const shouldShowPlayIcon =
      !playing || this.state.currentVolumeFade === VOLUME_FADE.OUT

    return createPortal(
      <div
        className={cls(
          'react-jinke-music-player-main',
          'touch-none font-[inherit] focus:outline-none',
          {
            'light-theme': theme === THEME.LIGHT,
            'dark-theme': theme === THEME.DARK,
          },
          className,
        )}
        style={style}
        ref={this.player}
        tabIndex={-1}
      >
        {toggle && isMobile && responsive && (
          <AudioPlayerMobile
            playing={playing}
            loading={loading}
            name={name}
            singer={singer}
            cover={cover}
            themeSwitch={ThemeSwitchComponent}
            duration={formattedAudioDuration}
            currentTime={formattedCurrentTime}
            progressBar={ProgressBar}
            onPlay={this.onTogglePlay}
            currentPlayModeName={currentPlayModeName}
            playMode={PlayModeComponent}
            audioNextPlay={this.onPlayNextAudio}
            audioPrevPlay={this.onPlayPrevAudio}
            icon={{
              ...this.iconMap,
              reload: ReloadComponent,
              download: DownloadComponent,
              lyric: LyricComponent,
            }}
            playModeTipVisible={playModeTipVisible}
            openAudioListsPanel={this.openAudioListsPanel}
            onClose={this.onHidePanel}
            extendsContent={extendsContent}
            glassBg={glassBg}
            autoHiddenCover={autoHiddenCover}
            onCoverClick={this.onCoverClick}
            locale={locale}
            toggleMode={toggleMode}
            renderAudioTitle={this.renderAudioTitle}
            shouldShowPlayIcon={shouldShowPlayIcon}
            isResetCoverRotate={isResetCoverRotate}
          />
        )}

        {toggle ? undefined : drag ? (
          <Draggable
            bounds={bounds}
            position={{ x: moveX, y: moveY }}
            onDrag={this.onControllerDrag}
            onStop={this.onControllerDragStop}
            onStart={this.onControllerDragStart}
          >
            {AudioController}
          </Draggable>
        ) : (
          AudioController
        )}
        {toggle && (!isMobile || !responsive) && (
          <div
            className={cls(
              'music-player-panel',
              'shadow-[0_0_3px_#403f3f] fixed w-full bottom-0 left-0 text-(--rjmp-panel-color) h-(--rjmp-panel-height) bg-(--rjmp-panel-bg) z-99 transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type) animate-[translate_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]',
              {
                'glass-bg backdrop-blur-[10px]': glassBg,
              },
            )}
          >
            <section className="panel-content h-full px-7.5 relative overflow-hidden flex items-center justify-center">
              {/* lgtm [js/trivial-conditional] */}
              {(!autoHiddenCover || (autoHiddenCover && cover)) && (
                <div
                  className={cls(
                    'img-content img-rotate',
                    'w-12.5 h-12.5 rounded-[50%] overflow-hidden bg-size-[100%] bg-no-repeat shadow-[0_0_10px_rgba(0,34,77,0.05)] cursor-pointer animate-[imgRotate_15s_linear_infinite]',
                    'max-md:w-10 max-md:h-10',
                    {
                      'img-rotate-pause [animation-play-state:paused]!':
                        !playing || !cover,
                      'img-rotate-reset animate-[coverReset_var(--rjmp-animate-time)_var(--rjmp-animate-type)_forwards]!': isResetCoverRotate,
                    },
                  )}
                  style={{ backgroundImage: `url(${cover})` }}
                  onClick={() => this.onCoverClick()}
                />
              )}
              <div className="progress-bar-content flex-1 px-5 overflow-hidden max-md:hidden!">
                <span
                  className="audio-title transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type) inline-block w-full truncate"
                  title={audioTitle}
                >
                  {this.renderAudioTitle()}
                </span>
                <section className="audio-main w-full inline-flex justify-center mt-1.5">
                  <span
                    className="current-time text-xs basis-[5%] transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type)"
                    title={formattedCurrentTime}
                  >
                    {loading ? '--' : formattedCurrentTime}
                  </span>
                  <div className="progress-bar flex-auto w-full mx-5 mt-0.5 relative">
                    {ProgressBar}
                  </div>
                  <span
                    className="duration text-xs basis-[5%] transition-colors duration-(--rjmp-animate-time) ease-(--rjmp-animate-type)"
                    title={formattedAudioDuration}
                  >
                    {loading ? '--' : formattedAudioDuration}
                  </span>
                </section>
              </div>
              <div className="player-content pl-[5%] inline-flex items-center content-center basis-[15%]">
                {!showPlay ? (
                  loading && this.iconMap.loading
                ) : (
                  <span className={PLAYER_CONTENT_GROUP_CLASS}>
                    <span
                      className="group prev-audio flex [&_svg]:text-[35px]"
                      title={locale.previousTrackText as string}
                      onClick={this.onPlayPrevAudio}
                    >
                      {this.iconMap.prev}
                    </span>
                    {loading ? (
                      <span
                        className="group loading-icon flex px-4.5"
                        title={locale.loadingText as string}
                      >
                        {this.iconMap.loading}
                      </span>
                    ) : (
                      <span
                        className="group play-btn flex px-4.5 [&_svg]:text-[26px]"
                        onClick={this.onTogglePlay}
                        title={
                          shouldShowPlayIcon
                            ? (locale.clickToPlayText as string)
                            : (locale.clickToPauseText as string)
                        }
                      >
                        {shouldShowPlayIcon
                          ? this.iconMap.play
                          : this.iconMap.pause}
                      </span>
                    )}
                    <span
                      className="group next-audio flex [&_svg]:text-[35px]"
                      title={locale.nextTrackText as string}
                      onClick={this.onPlayNextAudio}
                    >
                      {this.iconMap.next}
                    </span>
                  </span>
                )}

                {ReloadComponent}
                {DownloadComponent}
                {ThemeSwitchComponent}
                {extendsContent || null}

                {/* Volume control UI element in the music player panel. */}
                <span
                  className={cls(
                    PLAYER_CONTENT_GROUP_CLASS,
                    'play-sounds max-md:hidden! [&_svg]:text-[28px]',
                  )}
                  title={locale.volumeText as string}
                >
                  {soundValue === 0 ? (
                    <span
                      className="sounds-icon flex mr-3.75 flex-auto"
                      onClick={this.onResetVolume}
                    >
                      {this.iconMap.mute}
                    </span>
                  ) : (
                    <span
                      className="sounds-icon flex mr-3.75 flex-auto"
                      onClick={this.onAudioMute}
                    >
                      {this.iconMap.volume}
                    </span>
                  )}
                  <Slider
                    value={soundValue}
                    onChange={this.onAudioSoundChange}
                    className="sound-operation w-25"
                    {...VOLUME_BAR_SLIDER_OPTIONS}
                  />
                </span>

                {PlayModeComponent}

                {LyricComponent}

                <span
                  className={cls(
                    PLAYER_CONTENT_GROUP_CLASS,
                    'audio-lists-btn select-none min-w-15 h-7 rounded-[40px] bg-black/30 px-2.5 shadow-[0_0_1px_1px_rgba(255,255,255,0.02)] relative [transition:color,background-color_var(--rjmp-animate-time)_var(--rjmp-animate-type)]',
                  )}
                  title={locale.playListsText as string}
                  onClick={this.openAudioListsPanel}
                >
                  <span className="audio-lists-icon flex">
                    {this.iconMap.playLists}
                  </span>
                  <span className="audio-lists-num ml-2">
                    {audioLists.length}
                  </span>
                </span>

                {toggleMode && (
                  <span
                    className="group hide-panel cursor-pointer text-center flex-[1_1_10%] ml-3.75 mr-2.5 max-md:mr-1.5 [@media_(max-width:320px)]:mr-1 inline-flex items-center justify-center [&>svg]:cursor-pointer"
                    title={locale.toggleMiniModeText as string}
                    onClick={this.onHidePanel}
                  >
                    {this.iconMap.toggle}
                  </span>
                )}

                {DestroyComponent}
              </div>
            </section>
          </div>
        )}
        {/* Playlists panel: Renders the audio lists UI panel and wires its interactions. */}
        <AudioListsPanel
          playing={playing}
          playId={playId}
          loading={loading}
          visible={audioListsPanelVisible}
          audioLists={audioLists}
          onPlay={this.audioListsPlay}
          onCancel={this.closeAudioListsPanel}
          icon={this.iconMap}
          isMobile={isMobile}
          panelToggleAnimate={panelToggleAnimate}
          glassBg={glassBg}
          cover={cover}
          remove={remove}
          onDelete={this.onDeleteAudioLists}
          removeId={removeId}
          locale={locale}
        />
        {/* Play mode tooltip: Displays the current playback mode on mobile. */}
        {!isMobile && (
          <PlayModel
            visible={playModelNameVisible}
            value={currentPlayModeName}
          />
        )}
        {/* Lyrics panel: Displays the current song's lyrics with draggable positioning. */}
        {audioLyricVisible && (
          <Draggable>
            <div
              className={cls(
                'music-player-lyric',
                'fixed z-998 bottom-[calc(var(--rjmp-panel-height)+20px)] w-full left-0 text-center text-(--rjmp-lyric-color) text-(length:--rjmp-lyric-font-size) max-md:text-(length:--rjmp-lyric-font-size-mobile) max-md:z-999 cursor-move transition-shadow duration-(--rjmp-animate-time) ease-(--rjmp-animate-type) bg-transparent [text-shadow:0_1px_1px_rgba(255,255,255,0.05)]',
                lyricClassName,
              )}
            >
              {currentLyric || locale.emptyLyricText}
            </div>
          </Draggable>
        )}
        <audio
          className="music-player-audio hidden!"
          title={audioTitle}
          {...preloadState}
          src={musicSrc}
          ref={(node) => {
            this.audio = node as HTMLAudioElement
          }}
        />
      </div>,
      container,
    )
  }

  getPlayIndex = (
    playIndex = this.state.playIndex,
    audioLists = this.state.audioLists,
  ) => {
    return Math.max(
      DEFAULT_PLAY_INDEX,
      Math.min(audioLists.length - 1, playIndex),
    )
  }

  onCoverClick = (mode: ReactJkMusicPlayerMode = MODE.FULL) => {
    const { showMiniModeCover } = this.props
    const { cover } = this.state
    if (!showMiniModeCover && mode === MODE.MINI) {
      return
    }
    if (this.props.onCoverClick && cover) {
      this.props.onCoverClick(
        mode,
        this.state.audioLists,
        this.getBaseAudioInfo(),
      )
    }
  }

  getAudioTitle = (): ReactNode => {
    const { audioTitle } = this.locale || {}
    const { name, singer } = this.state
    if (typeof audioTitle === 'function' && this.audio) {
      return audioTitle(this.getBaseAudioInfo())
    }
    return audioTitle || `${name}${singer ? ` - ${singer}` : ''}`
  }

  renderAudioTitle = (): ReactNode => {
    const { isMobile, name } = this.state
    if (this.props.renderAudioTitle) {
      return this.props.renderAudioTitle(this.getBaseAudioInfo(), isMobile)
    }
    return isMobile ? name : this.getAudioTitle()
  }

  toggleAudioLyric = () => {
    this.setState({
      audioLyricVisible: !this.state.audioLyricVisible,
    })
  }

  // 播放模式切换
  togglePlayMode = () => {
    let index = this._PLAY_MODE_.findIndex(
      (mode) => mode === this.state.playMode,
    )
    const playMode =
      index === this._PLAY_MODE_LENGTH_ - 1
        ? this._PLAY_MODE_[0]
        : this._PLAY_MODE_[++index]
    this.setState({
      playMode,
      playModelNameVisible: true,
      playModeTipVisible: true,
    })
    this.props.onPlayModeChange && this.props.onPlayModeChange(playMode)

    clearTimeout(this.playModelTimer)
    this.playModelTimer = setTimeout(() => {
      this.setState({ playModelNameVisible: false, playModeTipVisible: false })
    }, this.props.playModeShowTime)
  }

  // Render the play mode icon for the corresponding button.
  renderPlayModeIcon = (playMode: ReactJkMusicPlayerPlayMode) => {
    const animateProps = {
      className:
        'react-jinke-music-player-mode-icon animate-[scaleTo_var(--rjmp-animate-time)_var(--rjmp-animate-type)]',
    }
    let IconNode = null
    switch (playMode) {
      case PLAY_MODE.order:
        IconNode = cloneElement(
          this.iconMap.order as ReactElement,
          animateProps,
        )
        break
      case PLAY_MODE.orderLoop:
        IconNode = cloneElement(
          this.iconMap.orderLoop as ReactElement,
          animateProps,
        )
        break
      case PLAY_MODE.singleLoop:
        IconNode = cloneElement(this.iconMap.loop as ReactElement, animateProps)
        break
      case PLAY_MODE.shufflePlay:
        IconNode = cloneElement(
          this.iconMap.shuffle as ReactElement,
          animateProps,
        )
        break
      default:
        IconNode = cloneElement(
          this.iconMap.order as ReactElement,
          animateProps,
        )
    }
    return IconNode
  }

  /**
   * Handles selecting tracks within the music list panel, updating playback state and metadata.
   * Previous/next track
   * Music end
   * General method
   * @description: ignore If true, do not pause when playId is the same. Used for random play, replay, etc.
   */
  audioListsPlay = (
    playId: string,
    ignore = false,
    state: ReactJkMusicPlayerState = this.state,
  ) => {
    const {
      playId: currentPlayId,
      playing,
      audioLists,
      loading,
      canPlay,
    } = state
    if (Array.isArray(audioLists) && audioLists.length === 0) {
      // eslint-disable-next-line no-console
      return console.warn(
        'Warning: Your playlist has no songs. and cannot play !',
      )
    }
    if (loading && playId === currentPlayId) {
      return
    }
    const playIndex = audioLists.findIndex(
      (audio) => audio[PLAYER_KEY] === playId,
    )
    const { name, cover, musicSrc, singer, lyric = '' } = (audioLists[
      playIndex
    ] || {}) as ReactJkMusicPlayerAudioList

    const loadAudio = (originMusicSrc: string) => {
      this.setState(
        {
          name,
          cover,
          musicSrc: originMusicSrc,
          singer,
          playId,
          lyric,
          currentTime: 0,
          playing: false,
          loading: true,
          canPlay: false,
          loadedProgress: 0,
          playIndex,
          isAutoPlayWhenUserClicked: true,
        },
        () => {
          this.lyric && this.lyric.stop()
          this.audio.load()
          this.updateMediaSessionMetadata()
          setTimeout(() => {
            this.initLyricParser()
          }, 0)
        },
      )
    }
    // If clicking the current item, pause or play.
    if (playId === currentPlayId && !ignore) {
      this.setState({ playing: !playing })
      if (!playing) {
        if (canPlay) {
          this.play()
          return
        }
        return loadAudio(musicSrc as string)
      }
      return this.audio.pause()
    }

    this.props.onAudioPlayTrackChange &&
      this.props.onAudioPlayTrackChange(
        playId,
        audioLists,
        this.getBaseAudioInfo(),
      )
    this.props.onPlayIndexChange && this.props.onPlayIndexChange(playIndex)

    switch (typeof musicSrc) {
      case 'function':
        musicSrc().then(loadAudio, this.onAudioError)
        break
      default:
        loadAudio(musicSrc as string)
    }
  }

  resetAudioStatus = () => {
    this.audio.pause()
    this.lyric && this.lyric.stop()
    this.initPlayInfo([])
    this.resetAudioPlayStatus()
    this.resetAudioPlayId()
  }

  resetAudioPlayId = () => {
    this.setState({ playId: this.initPlayId })
  }

  clearAudioLists = () => {
    this.props.onAudioListsChange &&
      this.props.onAudioListsChange('', [], {} as ReactJkMusicPlayerAudioInfo)
    this.resetAudioStatus()
  }

  onDeleteAudioLists = (audioId?: string) => (e: MouseEvent) => {
    e.stopPropagation()
    // If no id is passed, delete all
    const { audioLists, playId } = this.state
    if (audioLists.length < 1) {
      return
    }
    this.lyric && this.lyric.stop()
    if (!audioId) {
      this.clearAudioLists()
      return
    }
    const newAudioLists = [...audioLists].filter(
      (audio) => audio[PLAYER_KEY] !== audioId,
    )
    // Triggers delete animation before removing an audio item, then updates list.
    this.setState({ removeId: audioId })
    setTimeout(() => {
      this.setState(
        {
          audioLists: newAudioLists,
          removeId: -1,
        },
        () => {
          if (!newAudioLists.length) {
            return this.resetAudioStatus()
          }
          // If the deleted item is the currently playing track, play the next track.
          if (audioId === playId) {
            this.handlePlay(PLAY_MODE.orderLoop)
          }
        },
      )
    }, AUDIO_LIST_REMOVE_ANIMATE_TIME)

    this.props.onAudioListsChange &&
      this.props.onAudioListsChange(
        playId,
        newAudioLists,
        this.getBaseAudioInfo(),
      )
  }

  openAudioListsPanel = () => {
    this.setState(({ audioListsPanelVisible }) => ({
      initAnimate: true,
      audioListsPanelVisible: !audioListsPanelVisible,
    }))
    this.props.onAudioListsPanelChange &&
      this.props.onAudioListsPanelChange(!this.state.audioListsPanelVisible)
  }

  closeAudioListsPanel = (e: MouseEvent) => {
    e.stopPropagation()
    this._closeAudioListsPanel()
  }

  _closeAudioListsPanel = () => {
    const { audioListsPanelVisible } = this.state
    this.setState({ audioListsPanelVisible: false })
    if (audioListsPanelVisible) {
      this.props.onAudioListsPanelChange &&
        this.props.onAudioListsPanelChange(false)
    }
  }

  themeChange = (isLight: boolean) => {
    const theme = isLight ? THEME.LIGHT : THEME.DARK
    this.setState({
      theme,
    })
    this.props.onThemeChange && this.props.onThemeChange(theme)
  }

  onAudioDownload = () => {
    const { musicSrc } = this.state
    if (this.state.musicSrc) {
      const { customDownloader } = this.props
      const baseAudioInfo = this.getBaseAudioInfo()
      const onBeforeAudioDownload = this.props.onBeforeAudioDownload(
        baseAudioInfo,
      )
      let transformedDownloadAudioInfo = {} as TransformedDownloadAudioInfo
      if (onBeforeAudioDownload && onBeforeAudioDownload.then) {
        onBeforeAudioDownload.then((info) => {
          const { src, filename, mimeType } = info
          transformedDownloadAudioInfo = info
          if (customDownloader) {
            customDownloader(info)
          } else {
            download(src, filename, mimeType)
          }
        })
      } else {
        customDownloader
          ? customDownloader({ src: musicSrc })
          : download(musicSrc)
      }
      this.props.onAudioDownload &&
        this.props.onAudioDownload(baseAudioInfo, transformedDownloadAudioInfo)
    }
  }

  onControllerDrag = (e: DraggableEvent, { x, y }: DraggableData) => {
    const { moveX, moveY } = this.state
    this.isDrag = true

    // mousedown will trigger drag event on android devices (react-draggable) :(
    if (moveX === x && moveY === y) {
      this.isDrag = false
    }
  }

  onControllerDragStart = (e: DraggableEvent, { x, y }: DraggableData) => {
    this.isDrag = false
    this.setState({ moveX: x, moveY: y })
  }

  onControllerDragStop = (e: DraggableEvent, { x, y }: DraggableData) => {
    if (
      this.props.showDestroy &&
      this.destroyBtn &&
      this.destroyBtn.current &&
      this.destroyBtn.current.contains(e.target as Node)
    ) {
      this.onDestroyPlayer()
      return
    }

    if (!this.isDrag) {
      if (this.state.isNeedMobileHack) {
        this.loadAndPlayAudio()
        this.setState({ isNeedMobileHack: false })
      }
      this.onOpenPanel()
    }
    this.setState({ moveX: x, moveY: y })
  }

  onResetVolume = () => {
    const { currentAudioVolume } = this.state
    this.setAudioVolume(this.getVolumeBarValue(currentAudioVolume || 0.1))
  }

  setAudioVolume = (volumeBarValue: number) => {
    this.audio.volume = this.getListeningVolume(volumeBarValue)
    this.setState({
      currentAudioVolume: volumeBarValue,
      soundValue: volumeBarValue,
    })

    // Update fade-in interval to transition to new volume
    if (this.state.currentVolumeFade === VOLUME_FADE.IN) {
      this.state.updateIntervalEndVolume &&
        this.state.updateIntervalEndVolume(volumeBarValue)
    }
  }

  stopAll = (target: Event) => {
    target.stopPropagation()
    target.preventDefault()
  }

  getBoundingClientRect = (ele: Element) => {
    const { left, top } = ele.getBoundingClientRect()
    return {
      left,
      top,
    }
  }

  getListeningVolume = (volumeBarValue: number) => {
    return volumeBarValue ** 2
  }

  getVolumeBarValue = (listeningVolume: number) => {
    return Math.sqrt(listeningVolume)
  }

  onAudioReload = () => {
    if (this.props.audioLists.length) {
      this.handlePlay(PLAY_MODE.singleLoop)
      this.props.onAudioReload &&
        this.props.onAudioReload(this.getBaseAudioInfo())
    }
  }

  onOpenPanel = () => {
    const { toggleMode, spaceBar } = this.props
    if (toggleMode) {
      this.setState({ toggle: true })
      this.props.onModeChange && this.props.onModeChange(MODE.FULL)
      if (spaceBar && this.player.current) {
        this.player.current.focus({ preventScroll: true })
      }
    }
    this.onCoverClick(MODE.MINI)
  }

  onHidePanel = () => {
    this.setState({ toggle: false, audioListsPanelVisible: false })
    this.props.onModeChange && this.props.onModeChange(MODE.MINI)
  }

  onDestroyPlayer = () => {
    if (this.props.onBeforeDestroy) {
      const onBeforeDestroy = Promise.resolve(
        this.props.onBeforeDestroy(
          this.state.playId,
          this.state.audioLists,
          this.getBaseAudioInfo(),
        ),
      )

      if (onBeforeDestroy && onBeforeDestroy.then) {
        onBeforeDestroy
          .then(() => {
            this._onDestroyPlayer()
          })
          // ignore unhandledrejection handler
          .catch(() => {})
      }
      return
    }
    this._onDestroyPlayer()
  }

  _onDestroyPlayer = () => {
    this.unInstallPlayer()
  }

  _onDestroyed = () => {
    this.setState({ isPlayDestroyed: true })
    if (this.props.onDestroyed) {
      this.props.onDestroyed(
        this.state.playId,
        this.state.audioLists,
        this.getBaseAudioInfo(),
      )
    }
  }

  getCurrentPlayIndex = () => {
    return this.state.audioLists.findIndex(
      (audio) => audio[PLAYER_KEY] === this.state.playId,
    )
  }

  resetAudioPlayStatus = () => {
    return new Promise<void>((res) => {
      this.setState(
        {
          currentTime: 0,
          loading: false,
          playing: false,
          canPlay: false,
          lyric: '',
          currentLyric: '',
          loadedProgress: 0,
          playIndex: DEFAULT_PLAY_INDEX,
        },
        res,
      )
    })
  }

  // Returns audio information to the user
  getBaseAudioInfo(): ReactJkMusicPlayerAudioInfo {
    const {
      cover,
      name,
      musicSrc,
      soundValue,
      lyric,
      audioLists,
      currentLyric,
    } = this.state

    const {
      currentTime,
      muted,
      networkState,
      readyState,
      played,
      paused,
      ended,
      startDate,
    } = (this.audio || {}) as HTMLAudioElement & { startDate?: any }

    const currentPlayIndex = this.getCurrentPlayIndex()
    const currentAudioListInfo = (audioLists[currentPlayIndex] ||
      {}) as ReactJkMusicPlayerAudioList

    return {
      ...currentAudioListInfo,
      cover: cover as string,
      name: name as string,
      musicSrc,
      volume: soundValue,
      currentTime,
      duration: this.audioDuration,
      muted,
      networkState,
      readyState,
      played,
      paused,
      ended,
      startDate,
      lyric: lyric as string,
      currentLyric: currentLyric as string,
      playIndex: currentPlayIndex,
    } as ReactJkMusicPlayerAudioInfo
  }

  onTogglePlay = () => {
    this.setState({ isAudioSeeking: false })
    if (this.state.audioLists.length >= 1) {
      const { fadeIn, fadeOut } = this.props.volumeFade || {}
      const { currentVolumeFade, currentVolumeFadeInterval } = this.state
      const isCurrentlyFading =
        currentVolumeFade === VOLUME_FADE.IN ||
        currentVolumeFade === VOLUME_FADE.OUT

      /**
       * Currently in middle of fading in/out, so need to cancel the current interval and do the opposite action.
       * E.g. if currently fading out, then we need to cancel the fade-out and do a fade-in starting at current volume.
       */
      if (isCurrentlyFading) {
        // Clear current fade-in/out
        clearInterval(currentVolumeFadeInterval)
        this.setState({
          currentVolumeFadeInterval: undefined,
          updateIntervalEndVolume: undefined,
        })
      }

      // Currently playing track or in the middle of fading in
      if (
        (!isCurrentlyFading && this.state.playing) ||
        currentVolumeFade === VOLUME_FADE.IN
      ) {
        this.setState({ currentVolumeFade: VOLUME_FADE.OUT })
        // Fade in from current volume to 0
        const {
          fadeInterval: fadeOutInterval,
          updateIntervalEndVolume,
        } = adjustVolume(
          this.audio,
          this.audio.volume,
          0,
          {
            duration: fadeOut,
          },
          () => {
            this.audio.pause()
            this.setState({
              currentVolumeFade: VOLUME_FADE.NONE,
              currentVolumeFadeInterval: undefined,
              playing: false,
              updateIntervalEndVolume: undefined,
            })
            // Restore volume so slider does not reset to zero
            this.audio.volume = this.getListeningVolume(this.state.soundValue)
          },
        )

        this.setState({
          currentVolumeFadeInterval: fadeOutInterval,
          updateIntervalEndVolume,
        })
      } else {
        this.setState({ currentVolumeFade: VOLUME_FADE.IN })
        // Start volume may not be 0 if interrupting a fade-out
        const startVolume = isCurrentlyFading ? this.audio.volume : 0
        const endVolume = this.getListeningVolume(this.state.soundValue)
        const {
          fadeInterval: fadeInInterval,
          updateIntervalEndVolume,
        } = adjustVolume(
          this.audio,
          startVolume,
          endVolume,
          {
            duration: fadeIn,
          },
          () => {
            this.setState({
              currentVolumeFade: VOLUME_FADE.NONE,
              currentVolumeFadeInterval: undefined,
              updateIntervalEndVolume: undefined,
            })
            // It's possible that the volume level in the UI has changed since beginning of fade
            this.audio.volume = this.getListeningVolume(this.state.soundValue)
          },
        )

        this.setState(
          {
            currentVolumeFadeInterval: fadeInInterval,
            updateIntervalEndVolume,
            isAutoPlayWhenUserClicked: true,
          },
          () => {
            if (fadeInInterval) {
              this.audio.volume = startVolume
            }
            this.loadAndPlayAudio()
          },
        )
      }
    }
  }

  playAudio = (isLoaded = false) => {
    if (this.isAudioCanPlay || isLoaded) {
      if (isLoaded) {
        this.setAudioLoaded()
      }
      this.loadAndPlayAudio(isLoaded)
    }
  }

  setAudioLoaded = () => {
    this.setState({
      loading: false,
      playing: false,
    })
  }

  onAudioPause = () => {
    this.setState({ playing: false })
    this.props.onAudioPause && this.props.onAudioPause(this.getBaseAudioInfo())
    if (this.state.lyric && this.lyric) {
      this.lyric.togglePlay()
    }
  }

  onAudioPlay = () => {
    // Audio currentTime changed will be trigger audio playing event
    if (this.state.isAudioSeeking) {
      return
    }
    this.setState({ playing: true, loading: false })
    this.props.onAudioPlay && this.props.onAudioPlay(this.getBaseAudioInfo())
    if (this.state.lyric && this.lyric) {
      this.lyric.togglePlay()
    }
  }

  onSetAudioLoadedProgress = () => {
    const { buffered: timeRanges, duration } = this.audio
    if (timeRanges.length && timeRanges.end) {
      const loadedProgress =
        (timeRanges.end(timeRanges.length - 1) / duration) * 100

      this.setState({ loadedProgress })
    }
  }

  loadAndPlayAudio = (isLoaded: boolean | Event = false) => {
    const { remember } = this.props
    const { isInitRemember, musicSrc } = this.state
    const { networkState, readyState } = this.audio

    if (!musicSrc) {
      return
    }

    if (
      networkState === AUDIO_NETWORK_STATE.NETWORK_NO_SOURCE ||
      networkState === AUDIO_NETWORK_STATE.NETWORK_EMPTY
    ) {
      return this.onAudioError({
        reason: `
          [loadAndPlayAudio]: Failed to load because no supported source was found.
          current network status is ${networkState}.
        `,
      })
    }

    this.setState({
      playing: false,
      loading: true,
      isAudioSeeking: false,
      isResetCoverRotate: false,
    })

    if (isLoaded || readyState >= AUDIO_READY_STATE.HAVE_FUTURE_DATA) {
      const { playing } = this.getLastPlayStatus()
      const isLastPause = remember && !isInitRemember && !playing
      const canPlay = remember ? !isLastPause : this.isAudioCanPlay
      this.setState(
        {
          playing: canPlay,
          loading: false,
        },
        () => {
          if (canPlay) {
            this.play()
          }
          this.setState({
            isInitAutoPlay: true,
            isInitRemember: true,
            isAutoPlayWhenUserClicked: false,
          })
        },
      )
    } else {
      this.audio.load()
    }
  }

  onAudioError = (error?: any) => {
    const { playMode, audioLists, playId, musicSrc } = this.state
    const { loadAudioErrorPlayNext } = this.props
    const isSingleLoop = playMode === PLAY_MODE.singleLoop
    const currentPlayMode = isSingleLoop ? PLAY_MODE.order : playMode

    this.lyric && this.lyric.stop()

    // Handles case when music list becomes empty due to deletion or similar.
    // This will trigger https://developer.mozilla.org/en-US/docs/Web/API/MediaError
    if (musicSrc) {
      // If current music fails to load, try playing the next song
      if (loadAudioErrorPlayNext && audioLists.length) {
        const isLastAudio =
          (playMode === PLAY_MODE.order || playMode === PLAY_MODE.orderLoop) &&
          playId === audioLists[audioLists.length - 1][PLAYER_KEY]
        if (!isLastAudio) {
          this.handlePlay(currentPlayMode, true)
        }
      }

      this.props.onAudioError &&
        this.props.onAudioError(
          this.audio.error || (error && error.reason) || null,
          playId,
          audioLists,
          this.getBaseAudioInfo(),
        )
    }
  }

  // isNext true for next song, false for previous song
  handlePlay = (playMode: string, isNext = true) => {
    const { playId, audioLists } = this.state
    const audioListsLen = audioLists.length
    if (!audioListsLen) {
      return
    }
    const currentPlayIndex = this.getCurrentPlayIndex()

    switch (playMode) {
      // Order playback
      case PLAY_MODE.order:
        // After drag-and-drop sorting or normal playback, pause at the last song
        if (currentPlayIndex === audioListsLen - 1) {
          this.audio.pause()
          return
        }

        this.audioListsPlay(
          isNext
            ? (audioLists[currentPlayIndex + 1][PLAYER_KEY] as string)
            : (audioLists[currentPlayIndex - 1][PLAYER_KEY] as string),
        )
        break

      // List loop
      case PLAY_MODE.orderLoop:
        if (isNext) {
          if (currentPlayIndex === audioListsLen - 1) {
            return this.audioListsPlay(audioLists[0][PLAYER_KEY] as string)
          }
          this.audioListsPlay(
            audioLists[currentPlayIndex + 1][PLAYER_KEY] as string,
          )
        } else {
          if (currentPlayIndex === 0) {
            return this.audioListsPlay(
              audioLists[audioListsLen - 1][PLAYER_KEY] as string,
            )
          }
          this.audioListsPlay(
            audioLists[currentPlayIndex - 1][PLAYER_KEY] as string,
          )
        }
        break

      // Single loop
      case PLAY_MODE.singleLoop:
        this.audio.currentTime = 0
        this.audioListsPlay(playId, true)
        break

      // Random play
      case PLAY_MODE.shufflePlay:
        {
          let randomIndex = createRandomNum(0, audioListsLen - 1)
          if (randomIndex === this.getCurrentPlayIndex()) {
            randomIndex = this.getPlayIndex(randomIndex + 1)
          }
          const randomPlayId = ((audioLists[randomIndex] ||
            {}) as ReactJkMusicPlayerAudioList)[PLAYER_KEY]
          this.audioListsPlay(randomPlayId as string, true)
        }
        break
      default:
        break
    }
  }

  onAudioEnd = () => {
    this.props.onAudioEnded &&
      this.props.onAudioEnded(
        this.state.playId,
        this.state.audioLists,
        this.getBaseAudioInfo(),
      )
    this.handlePlay(this.state.playMode)
  }

  /**
   * Previous and next song universal method
   * Except for random play, all other modes will play the next song in order when clicking previous or next
   * Reference conventional player logic
   */
  audioPrevAndNextBasePlayHandle = (isNext = true) => {
    const { playMode } = this.state
    let _playMode = ''
    switch (playMode) {
      case PLAY_MODE.shufflePlay:
        _playMode = playMode
        break
      default:
        _playMode = PLAY_MODE.orderLoop
        break
    }
    this.handlePlay(_playMode, isNext)
  }

  onPlayPrevAudio = () => {
    const { restartCurrentOnPrev } = this.props
    if (restartCurrentOnPrev && this.audio.currentTime > 1) {
      this.audio.currentTime = 0
      return
    }

    this.audioPrevAndNextBasePlayHandle(false)
  }

  onPlayNextAudio = () => {
    this.audioPrevAndNextBasePlayHandle(true)
  }

  audioTimeUpdate = () => {
    const { currentTime } = this.audio
    this.setState({ currentTime })
    if (this.props.remember) {
      this.saveLastPlayStatus()
    }
    this.props.onAudioProgress &&
      this.props.onAudioProgress(this.getBaseAudioInfo())
  }

  onAudioSoundChange = (value: number) => {
    this.setAudioVolume(value)
  }

  onAudioVolumeChange = () => {
    const { volume } = this.audio
    const { currentVolumeFade, currentAudioVolume } = this.state
    if (
      currentVolumeFade !== VOLUME_FADE.NONE ||
      currentAudioVolume === volume
    ) {
      return
    }
    const volumeBarValue = this.getVolumeBarValue(volume)
    this.setState({
      soundValue: volumeBarValue,
    })
    if (this.props.onAudioVolumeChange) {
      const formattedVolume = parseFloat(volume.toFixed(4))
      this.props.onAudioVolumeChange(formattedVolume)
    }
  }

  onProgressChange = (currentTime: number) => {
    if (this.audio) {
      this.audio.currentTime = currentTime
    }
    this.setState({ currentTime, isAudioSeeking: true })
  }

  onAudioSeeked = (currentTime: number) => {
    this.setState({ isAudioSeeking: true })
    if (!this.state.audioLists.length) {
      return
    }
    this.lyric && this.lyric.seek(currentTime * 1000)

    if (!this.state.playing) {
      this.lyric && this.lyric.stop()
    }
    if (this.audio) {
      this.audio.currentTime = currentTime
    }

    this.props.onAudioSeeked &&
      this.props.onAudioSeeked(this.getBaseAudioInfo())

    setTimeout(() => {
      this.setState({ isAudioSeeking: false })
    }, 500)
  }

  onAudioMute = () => {
    this.setState(
      {
        soundValue: 0,
        currentAudioVolume: this.audio.volume,
      },
      () => {
        this.audio.volume = 0
      },
    )
  }

  onAudioAbort = (e: Event) => {
    const { audioLists, playId } = this.state
    const audioInfo = this.getBaseAudioInfo()
    const mergedAudioInfo = { ...e, ...audioInfo }
    this.props.onAudioAbort &&
      this.props.onAudioAbort(playId, audioLists, mergedAudioInfo)
  }

  toggleMode = (mode: ReactJkMusicPlayerMode) => {
    if (mode === MODE.FULL) {
      this.setState({ toggle: true })
    }
  }

  toggleTheme = (theme: ReactJkMusicPlayerTheme) => {
    this.setState({ theme })
  }

  onAudioListsSortEnd = ({
    oldIndex = 0,
    newIndex = 0,
  }: Sortable.SortableEvent) => {
    if (oldIndex === newIndex) {
      return
    }

    const { playId, audioLists } = this.state
    const _audioLists = [...audioLists]
    const item = _audioLists.splice(oldIndex, 1)[0]
    _audioLists.splice(newIndex, 0, item)

    // If the dragged song is currently playing, the playId equals the index after dragging
    const _playId =
      oldIndex === ((playId as unknown) as number)
        ? ((newIndex as unknown) as string)
        : playId

    this.setState({ audioLists: _audioLists, playId: _playId })

    this.props.onAudioListsSortEnd &&
      this.props.onAudioListsSortEnd(oldIndex, newIndex)

    this.props.onAudioListsChange &&
      this.props.onAudioListsChange(
        _playId,
        _audioLists,
        this.getBaseAudioInfo(),
      )

    // TODO: remove
    if (this.props.onAudioListsDragEnd) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Deprecated] onAudioListsDragEnd is deprecated. please use onAudioListsSortEnd(oldIndex, newIndex){}',
      )
      this.props.onAudioListsDragEnd(oldIndex, newIndex)
    }
  }

  saveLastPlayStatus = () => {
    const {
      currentTime,
      playId,
      theme,
      soundValue,
      playMode,
      name,
      cover,
      singer,
      musicSrc,
    } = this.state
    const lastPlayStatus = JSON.stringify({
      currentTime,
      playId,
      theme,
      playMode,
      soundValue,
      name,
      cover,
      singer,
      musicSrc,
    })
    localStorage.setItem('lastPlayStatus', lastPlayStatus)
  }

  getLastPlayStatus = (): Partial<ReactJkMusicPlayerState> => {
    const {
      theme,
      defaultPlayMode,
      playMode,
      defaultPlayIndex,
      playIndex,
    } = this.props

    const status: Partial<ReactJkMusicPlayerState> = {
      currentTime: 0,
      playMode: playMode || defaultPlayMode || PLAY_MODE.order,
      name: '',
      cover: '',
      singer: '',
      musicSrc: '',
      lyric: '',
      playId: this.getDefaultPlayId(),
      theme,
      playing: true,
      playIndex: playIndex || defaultPlayIndex || 0,
    }
    try {
      return (
        JSON.parse(localStorage.getItem('lastPlayStatus') as string) || status
      )
    } catch (error) {
      return status
    }
  }

  checkCurrentPlayingAudioIsInUpdatedAudioLists = (
    nextProps: ResolvedProps = this.props,
  ) => {
    const { playId, musicSrc } = this.state
    if (!nextProps.quietUpdate || !Array.isArray(nextProps.audioLists)) {
      return false
    }
    return (
      playId &&
      nextProps.audioLists.some(
        (newAudioInfo) =>
          newAudioInfo[PLAYER_KEY] === playId ||
          newAudioInfo.musicSrc === musicSrc,
      )
    )
  }

  play = () => {
    // https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
    const playPromise = this.audio.play()
    if (playPromise && playPromise.then) {
      playPromise
        .then(() => {
          this.setState({ loading: false, playing: true })
        })
        .catch(() => {
          this.setState({ loading: false, playing: false })
        })
    }
  }

  mockAutoPlayForMobile = () => {
    if (this.props.autoPlay && !this.state.playing) {
      this.audio.load()
      this.play()
    }
  }

  bindMobileAutoPlayEvents = () => {
    document.addEventListener(
      'touchstart',
      () => {
        this.mockAutoPlayForMobile()
      },
      { once: true },
    )
    // Listen for WeChat ready event
    document.addEventListener('WeixinJSBridgeReady', () => {
      this.mockAutoPlayForMobile()
    })
  }

  bindSafariAutoPlayEvents = () => {
    document.addEventListener(
      'click',
      () => {
        this.mockAutoPlayForMobile()
      },
      { once: true },
    )
  }

  unBindEvents = (
    target: HTMLAudioElement | undefined = this.audio,
    eventsNames?: Record<string, (e?: any) => void>,
    bind = false,
  ) => {
    this.bindEvents(target, eventsNames, bind)
  }

  /**
   * Bind audio tag events
   */
  bindEvents = (
    target: HTMLAudioElement | undefined = this.audio,
    eventsNames: Record<string, (e?: any) => void> = {
      waiting: this.loadAndPlayAudio as (e?: any) => void,
      canplay: this.onAudioCanPlay,
      error: this.onAudioError,
      ended: this.onAudioEnd,
      pause: this.onAudioPause,
      play: this.onAudioPlay,
      timeupdate: this.audioTimeUpdate,
      volumechange: this.onAudioVolumeChange,
      abort: this.onAudioAbort,
      progress: this.onSetAudioLoadedProgress,
    },
    bind = true,
  ) => {
    const { once } = this.props
    for (const name in eventsNames) {
      const _events = eventsNames[name]
      if (target) {
        bind
          ? target.addEventListener(name, _events, {
              once: !!(once && name === 'play'),
            })
          : target.removeEventListener(name, _events)
      }
    }
  }

  getPlayId = (audioLists = this.state.audioLists): string => {
    const playIndex = this.getPlayIndex(undefined, audioLists)
    const playId =
      this.state.playId ||
      (audioLists[playIndex] && audioLists[playIndex][PLAYER_KEY])
    return playId as string
  }

  _getPlayInfo = (audioLists: ReactJkMusicPlayerAudioList[] = []) => {
    const playId = this.getPlayId(audioLists)

    const {
      name = '',
      cover = '',
      singer = '',
      musicSrc = '',
      lyric = '',
    } = (audioLists.find((audio) => audio[PLAYER_KEY] === playId) ||
      {}) as ReactJkMusicPlayerAudioList

    return {
      name,
      cover,
      singer,
      musicSrc,
      lyric,
      audioLists,
      playId,
    }
  }

  getPlayInfo = (audioLists: ReactJkMusicPlayerAudioList[] = []) => {
    const newAudioLists = audioLists.filter((audio) => !audio[PLAYER_KEY])
    const lastAudioLists = audioLists.filter((audio) => audio[PLAYER_KEY])
    const mergedAudioLists = [
      ...lastAudioLists,
      ...newAudioLists.map((info) => {
        return {
          ...info,
          [PLAYER_KEY]: uuId(),
        }
      }),
    ]
    return this._getPlayInfo(mergedAudioLists)
  }

  // I change the name of getPlayInfo to getPlayInfoOfNewList because i didn't want to change the prior changes
  // the only thing this function does is to add id to audiolist elements.
  getPlayInfoOfNewList = (nextProps: ResolvedProps) => {
    const { audioLists = [] } = nextProps
    const _audioLists = audioLists.map((info) => {
      const prevAudioBeforeUpdate = ((nextProps.quietUpdate &&
        this.state.audioLists.find(
          ({ musicSrc }) => musicSrc === info.musicSrc,
        )) ||
        {}) as ReactJkMusicPlayerAudioList
      return {
        ...info,
        [PLAYER_KEY]: prevAudioBeforeUpdate[PLAYER_KEY] || uuId(),
      }
    })

    return this._getPlayInfo(_audioLists)
  }

  initPlayInfo = (
    audioLists: ReactJkMusicPlayerAudioList[] = [],
    cb?: () => void,
  ) => {
    const info = this.getPlayInfo(audioLists)

    switch (typeof info.musicSrc) {
      case 'function':
        info.musicSrc().then((originMusicSrc) => {
          this.setState({ ...info, musicSrc: originMusicSrc }, cb)
        }, this.onAudioError)
        break
      default:
        this.setState({ ...info, musicSrc: info.musicSrc }, cb)
    }
  }

  addMatchMediaListener = (
    query: string,
    handler: (e: { matches: boolean }) => void,
  ) => {
    const media = window.matchMedia(query)
    handler(media)
    if (media.addEventListener) {
      media.addEventListener('change', handler)
    } else {
      media.addListener(handler)
    }
    return media
  }

  removeMatchMediaListener = (
    media: MediaQueryList | undefined,
    handler: (e: { matches: boolean }) => void,
  ) => {
    if (media) {
      if (media.removeEventListener) {
        media.removeEventListener('change', handler)
      } else {
        media.removeListener && media.removeListener(handler)
      }
    }
  }

  addMobileListener = () => {
    this.mobileMedia = this.addMatchMediaListener(
      this.props.mobileMediaQuery,
      this.mobileMediaHandler,
    )
  }

  removeMobileListener = () => {
    this.removeMatchMediaListener(this.mobileMedia, this.mobileMediaHandler)
  }

  addSystemThemeListener = () => {
    this.systemThemeMedia = this.addMatchMediaListener(
      MEDIA_QUERY.DARK_THEME,
      this.systemThemeMediaHandler,
    )
  }

  removeSystemThemeListener = () => {
    this.removeMatchMediaListener(
      this.systemThemeMedia,
      this.systemThemeMediaHandler,
    )
  }

  mobileMediaHandler = ({ matches }: { matches: boolean }) => {
    this.setState({
      isMobile: !!matches,
    })
  }

  systemThemeMediaHandler = ({ matches }: { matches: boolean }) => {
    if (this.props.theme === THEME.AUTO) {
      const theme = matches ? THEME.DARK : THEME.LIGHT
      this.updateTheme(theme)
    }
  }

  setDefaultAudioVolume = () => {
    const { defaultVolume, remember } = this.props
    // 音量 [0-1]
    this.defaultVolume = Math.max(0, Math.min(defaultVolume, 1))
    const { soundValue = this.defaultVolume } = this.getLastPlayStatus()
    this.setAudioVolume(
      remember ? soundValue ?? this.defaultVolume : this.defaultVolume,
    )
  }

  getDefaultPlayId = (audioLists = this.props.audioLists): string => {
    const playIndex = this.getPlayIndex()
    return (audioLists[playIndex] &&
      audioLists[playIndex][PLAYER_KEY]) as string
  }

  initLyricParser = () => {
    this.lyric = new Lyric(this.state.lyric || '', this.onLyricChange)
    this.setState({
      currentLyric: this.lyric.lines[0] && this.lyric.lines[0].txt,
    })
  }

  onLyricChange = ({ lineNum, txt }: LyricHandlerParams) => {
    this.setState({
      currentLyric: txt,
    })
    this.props.onAudioLyricChange && this.props.onAudioLyricChange(lineNum, txt)
  }

  updateTheme = (theme?: ReactJkMusicPlayerTheme) => {
    if (
      theme &&
      theme !== this.props.theme &&
      Object.values(THEME).includes(theme)
    ) {
      this.setState({ theme })
    }
  }

  updateMode = (mode?: ReactJkMusicPlayerMode) => {
    if (
      mode &&
      mode !== this.props.mode &&
      Object.values(MODE).includes(mode)
    ) {
      this.setState({ toggle: mode === MODE.FULL })
      if (mode === MODE.MINI) {
        this._closeAudioListsPanel()
      }
    }
  }

  updatePlayMode = (playMode?: ReactJkMusicPlayerPlayMode) => {
    if (!playMode || !Object.values(PLAY_MODE).includes(playMode)) {
      return
    }
    if (playMode !== this.props.playMode) {
      this.setState({ playMode })
    }
  }

  updateAudioLists = (audioLists: ReactJkMusicPlayerAudioList[]) => {
    const newAudioLists = [
      ...this.state.audioLists,
      ...audioLists.filter(
        (audio) =>
          this.state.audioLists.findIndex(
            (v) => v.musicSrc === audio.musicSrc,
          ) === -1,
      ),
    ]
    this.initPlayInfo(newAudioLists)
    this.bindEvents(this.audio)
    this.props.onAudioListsChange &&
      this.props.onAudioListsChange(
        this.state.playId,
        audioLists,
        this.getBaseAudioInfo(),
      )
  }

  loadNewAudioLists = (nextProps: ResolvedProps) => {
    const {
      audioLists,
      remember,
      playMode,
      theme,
      autoPlayInitLoadPlayList,
      playIndex,
    } = nextProps
    if (!Array.isArray(audioLists) || !audioLists.length) {
      return
    }
    const info = this.getPlayInfoOfNewList(nextProps)
    const lastPlayStatus: Partial<ReactJkMusicPlayerState> = remember
      ? this.getLastPlayStatus()
      : {
          playMode: playMode || PLAY_MODE.order,
          playIndex: playIndex || DEFAULT_PLAY_INDEX,
        }

    if (theme !== THEME.AUTO) {
      lastPlayStatus.theme = theme
    }

    const audioInfo = {
      ...info,
      ...lastPlayStatus,
      isInitAutoPlay: autoPlayInitLoadPlayList,
      playing: this.isAudioCanPlay,
    }

    if (this.checkCurrentPlayingAudioIsInUpdatedAudioLists(nextProps)) {
      this.setState({ audioLists: info.audioLists })
      return
    }

    switch (typeof info.musicSrc) {
      case 'function':
        info.musicSrc().then((musicSrc) => {
          this.setState({
            ...audioInfo,
            musicSrc,
          } as ReactJkMusicPlayerState)
        }, this.onAudioError)
        break
      default:
        this.setState(audioInfo as ReactJkMusicPlayerState)
    }
  }

  resetPlayId = () => {
    return new Promise<void>((res) => {
      this.setState({ playId: this.initPlayId }, res)
    })
  }

  changeAudioLists = (nextProps: ResolvedProps) => {
    if (!this.checkCurrentPlayingAudioIsInUpdatedAudioLists(nextProps)) {
      this.resetAudioStatus()
    }
    this.resetPlayId().then(() => {
      this.loadNewAudioLists(nextProps)
      this.props.onAudioListsChange &&
        this.props.onAudioListsChange(
          this.state.playId,
          nextProps.audioLists,
          this.getBaseAudioInfo(),
        )
    })
  }

  updatePlayIndex = (playIndex?: number) => {
    const currentPlayIndex = this.getCurrentPlayIndex()
    if (playIndex !== undefined && currentPlayIndex !== playIndex) {
      this.resetAudioPlayStatus().then(() => {
        const currentPlayAudio = this.state.audioLists[
          this.getPlayIndex(playIndex)
        ]
        if (currentPlayAudio && currentPlayAudio[PLAYER_KEY]) {
          this.audioListsPlay(currentPlayAudio[PLAYER_KEY], true)
        }
      })
    }
  }

  playByIndex = (index: number) => {
    this.updatePlayIndex(index)
  }

  getEnhanceAudio = () => {
    const { audio } = this
    ;[
      {
        name: 'destroy',
        value: this.onDestroyPlayer,
      },
      {
        name: 'updatePlayIndex',
        value: this.updatePlayIndex,
      },
      {
        name: 'playByIndex',
        value: this.playByIndex,
      },
      {
        name: 'playNext',
        value: this.onPlayNextAudio,
      },
      {
        name: 'playPrev',
        value: this.onPlayPrevAudio,
      },
      {
        name: 'togglePlay',
        value: this.onTogglePlay,
      },
      {
        name: 'clear',
        value: this.clearAudioLists,
      },
      {
        name: 'sortable',
        value: this.sortable,
      },
    ].forEach(({ name, value }) => {
      Object.defineProperty(audio, name, {
        value,
        writable: false,
      })
    })
    return audio
  }

  onGetAudioInstance = () => {
    if (this.props.getAudioInstance) {
      this.props.getAudioInstance(
        this.getEnhanceAudio() as ReactJkMusicPlayerInstance,
      )
    }
  }

  updateMediaSessionMetadata = () => {
    if ('mediaSession' in navigator && this.props.showMediaSession) {
      const { name, cover, singer } = this.state
      const mediaMetaDataConfig: MediaMetadataInit = {
        title: name as string,
        artist: singer as string,
        album: name as string,
      }
      if (cover) {
        mediaMetaDataConfig.artwork = [
          '96x96',
          '128x128',
          '192x192',
          '256x256',
          '384x384',
          '512x512',
        ].map((size) => ({
          src: cover,
          sizes: size,
          type: 'image/png',
        }))
      }
      navigator.mediaSession.metadata = new MediaMetadata(mediaMetaDataConfig)
      this.updateMediaSessionPositionState()
    }
  }

  updateMediaSessionPositionState = () => {
    if ('setPositionState' in navigator.mediaSession) {
      try {
        const { audio } = this
        navigator.mediaSession.setPositionState({
          duration: this.audioDuration,
          playbackRate: audio.playbackRate || 1,
          position: audio.currentTime || 0,
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update media session position state failed: ', error)
      }
    }
  }

  onAddMediaSession = () => {
    if ('mediaSession' in navigator && this.props.showMediaSession) {
      const defaultSkipTime = 10
      navigator.mediaSession.setActionHandler('play', this.onTogglePlay)
      navigator.mediaSession.setActionHandler('pause', this.onTogglePlay)
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || defaultSkipTime
        this.audio.currentTime = Math.max(this.audio.currentTime - skipTime, 0)
        this.props.onAudioSeeked &&
          this.props.onAudioSeeked(this.getBaseAudioInfo())
      })
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || defaultSkipTime
        this.audio.currentTime = Math.min(
          this.audio.currentTime + skipTime,
          this.audioDuration,
        )
        this.props.onAudioSeeked &&
          this.props.onAudioSeeked(this.getBaseAudioInfo())
      })
      navigator.mediaSession.setActionHandler(
        'previoustrack',
        this.onPlayPrevAudio,
      )
      navigator.mediaSession.setActionHandler('nexttrack', this.onPlayNextAudio)

      setTimeout(() => {
        this.updateMediaSessionMetadata()
      }, 0)

      try {
        navigator.mediaSession.setActionHandler('seekto', (event) => {
          if (event.fastSeek && 'fastSeek' in this.audio) {
            this.audio.fastSeek(event.seekTime || 0)
            return
          }
          this.audio.currentTime = event.seekTime || 0
          this.updateMediaSessionPositionState()
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          'Warning! The "seekto" media session action is not supported.',
        )
      }
    }
  }

  bindUnhandledRejection = () => {
    window.addEventListener('unhandledrejection', this.onAudioError)
  }

  unBindUnhandledRejection = () => {
    window.removeEventListener('unhandledrejection', this.onAudioError)
  }

  bindKeyDownEvents = () => {
    if (this.props.spaceBar && this.player.current) {
      this.player.current.addEventListener('keydown', this.onKeyDown, false)
      this.player.current.focus({ preventScroll: true })
    }
  }

  unBindKeyDownEvents = () => {
    if (this.player.current) {
      this.player.current.removeEventListener('keydown', this.onKeyDown, false)
    }
  }

  onKeyDown = (e: KeyboardEvent) => {
    const { spaceBar } = this.props
    if (spaceBar && e.keyCode === SPACE_BAR_KEYCODE) {
      this.onTogglePlay()
    }
  }

  initPlayer = (
    audioLists = this.props.audioLists,
    isBindKeyDownEvents = true,
    resetAudioVolume = true,
  ) => {
    if (resetAudioVolume) {
      this.setDefaultAudioVolume()
    }
    if (!Array.isArray(audioLists) || !audioLists.length) {
      return
    }
    this.bindUnhandledRejection()
    this.bindEvents(this.audio)
    this.initLyricParser()
    this.onAddMediaSession()
    if (IS_MOBILE) {
      this.bindMobileAutoPlayEvents()
    } else {
      if (isBindKeyDownEvents) {
        this.bindKeyDownEvents()
      }
      if (isSafari()) {
        this.bindSafariAutoPlayEvents()
      }
    }
  }

  removeLyric = () => {
    if (this.lyric) {
      this.lyric.stop()
      this.lyric = undefined
    }
  }

  unInstallPlayer = () => {
    this.unBindEvents(this.audio, undefined, false)
    this.unBindUnhandledRejection()
    this.unBindKeyDownEvents()
    this.removeMobileListener()
    this.removeLyric()
    this._onDestroyed()
    this.sortable && this.sortable.destroy()
  }

  onAudioCanPlay = () => {
    if (this.state.isAudioSeeking) {
      return
    }
    this.setState({ canPlay: true }, () => {
      this.playAudio(true)
    })
  }

  initSortableAudioLists = () => {
    const { audioLists, sortableOptions } = this.props
    const { selector, ...defaultOptions } = SORTABLE_CONFIG
    const container = document.querySelector<HTMLElement>(`.${selector}`)
    if ((Array.isArray(audioLists) && !audioLists.length) || !container) {
      return
    }

    if (this.sortable) {
      this.sortable.destroy()
    }
    this.sortable = new Sortable(container, {
      onEnd: this.onAudioListsSortEnd,
      ...defaultOptions,
      ...sortableOptions,
    })
  }

  componentDidUpdate(
    _prevProps: ReactJkMusicPlayerProps,
    prevState: ReactJkMusicPlayerState,
  ) {
    if (prevState.musicSrc !== this.state.musicSrc) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ isResetCoverRotate: true })
    }
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps: ResolvedProps) {
    const {
      audioLists,
      playIndex,
      theme,
      mode,
      playMode,
      clearPriorAudioLists,
    } = nextProps
    const isEqualAudioLists = arrayEqual(audioLists)(this.props.audioLists)
    if (!isEqualAudioLists) {
      if (clearPriorAudioLists) {
        this.changeAudioLists(nextProps)
      } else {
        this.updateAudioLists(audioLists)
      }
      if (!this.checkCurrentPlayingAudioIsInUpdatedAudioLists(nextProps)) {
        this.initPlayer(audioLists, false, false)
      }
      setTimeout(() => this.initSortableAudioLists(), 200)
    }
    this.updatePlayIndex(
      !isEqualAudioLists && clearPriorAudioLists
        ? DEFAULT_PLAY_INDEX
        : playIndex,
    )
    this.updateTheme(theme)
    this.updateMode(mode)
    this.updatePlayMode(playMode)
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillMount() {
    const { audioLists, remember } = this.props

    if (Array.isArray(audioLists) && audioLists.length >= 1) {
      const playInfo = this.getPlayInfo(audioLists)
      const lastPlayStatus = remember ? this.getLastPlayStatus() : {}

      switch (typeof playInfo.musicSrc) {
        case 'function':
          playInfo.musicSrc().then((val) => {
            this.setState({
              ...playInfo,
              musicSrc: val,
              ...lastPlayStatus,
            } as ReactJkMusicPlayerState)
          }, this.onAudioError)
          break
        default:
          this.setState({
            ...playInfo,
            musicSrc: playInfo.musicSrc,
            ...lastPlayStatus,
          } as ReactJkMusicPlayerState)
      }
    }
  }

  componentWillUnmount() {
    this.unInstallPlayer()
  }

  componentDidMount() {
    this.addMobileListener()
    this.addSystemThemeListener()
    this.initPlayer()
    this.initSortableAudioLists()
    this.onGetAudioInstance()
  }
}
