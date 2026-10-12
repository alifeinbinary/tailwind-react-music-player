import { useEffect, useRef, useState } from 'react'
import MusicPlayer, {
  useMusicPlayer,
  type AudioInfo,
  type AudioTrack,
  type LocaleId,
  type MusicPlayerHandle,
  type MusicPlayerUIProps,
  type PlayerMode,
  type PlayMode,
  type Theme,
} from '../src'
import { lyric } from './lyric'
import '../src/styles/index.css'
import './example.css'

const audioList: AudioTrack[] = [
  {
    name: 'Listen At a Distance',
    singer: 'A Life in Binary',
    cover:
      'https://dj8rv0ejdatzv.cloudfront.net/files/9le9epk0p-Guilt-artwork.jpeg',
    musicSrc:
      'https://dj8rv0ejdatzv.cloudfront.net/files/689e5515f908500002e288f2/ALifeinBinary-ListenAtaDistance.mp3',
  },
  {
    name: 'Fantan Disco',
    singer: 'A Life in Binary',
    cover:
      'https://dj8rv0ejdatzv.cloudfront.net/files/68a6074812fa8c00025f59d6/stringsattached-artwork.webp',
    musicSrc:
      'https://dj8rv0ejdatzv.cloudfront.net/files/6661b4ac7acd5200083d7043/DM-FantanDisco.mp3',
  },
  {
    name: 'Answers Matter (lyric demo)',
    singer: 'A Life in Binary',
    lyric,
    cover:
      'https://dj8rv0ejdatzv.cloudfront.net/files/68a5f0bb78061000022cfc82/meditations-artwork.webp',
    musicSrc:
      'https://dj8rv0ejdatzv.cloudfront.net/files/691f9763031a0d000279e7bd/ALifeinBinary-AnswersMatter.mp3',
  },
]

const TOGGLES: (keyof MusicPlayerUIProps)[] = [
  'showMiniCover',
  'showMiniProgress',
  'showBuffered',
  'showPlayButton',
  'showReload',
  'showDownload',
  'showPlayMode',
  'showThemeSwitch',
  'showLyric',
  'showDestroy',
  'removable',
  'sortable',
  'draggable',
  'keyboardShortcuts',
  'glassBackground',
  'hideEmptyCover',
  'allowModeToggle',
  'responsive',
  'seekable',
]

const eventInfo = (i: AudioInfo) => `${i.track?.name ?? '—'}@${i.index}`

/** Minimal custom UI over the headless hook. */
function CustomPlayer() {
  const { state, actions, audioProps } = useMusicPlayer({
    audioLists: audioList,
    autoPlay: false,
  })
  return (
    <div className="custom-player">
      <audio {...audioProps}>
        <track kind="captions" />
      </audio>
      <button type="button" onClick={actions.togglePlay}>
        {state.status === 'playing' ? 'Pause' : 'Play'} {state.track?.name}
      </button>
      <button type="button" onClick={actions.next}>
        Next
      </button>
      <ul>
        {state.tracks.map((t, i) => (
          <li key={t.id}>
            <button
              type="button"
              data-current={i === state.index || undefined}
              onClick={() => actions.playIndex(i)}
            >
              {t.name} — {t.singer}
            </button>
          </li>
        ))}
      </ul>
      <progress max={state.duration || 1} value={state.currentTime} />
      <span>
        {Math.round(state.currentTime)}s / {Math.round(state.duration)}s
      </span>
    </div>
  )
}

const query = new URLSearchParams(
  typeof window === 'undefined' ? '' : window.location.search,
)
const flag = (name: string) => query.get(name) === '1'
const queryValue = <T extends string>(
  name: string,
  allowed: readonly T[],
): T | undefined => {
  const v = query.get(name) as T | null
  return v && allowed.includes(v) ? v : undefined
}

export default function Demo() {
  const playerRef = useRef<MusicPlayerHandle>(null)
  const [ui, setUi] = useState<Record<string, boolean>>({
    showMiniCover: true,
    showMiniProgress: false,
    showBuffered: true,
    showPlayButton: true,
    showReload: true,
    showDownload: true,
    showPlayMode: true,
    showThemeSwitch: true,
    showLyric: true,
    showDestroy: false,
    removable: true,
    sortable: true,
    draggable: true,
    keyboardShortcuts: true,
    glassBackground: flag('glass'),
    hideEmptyCover: false,
    allowModeToggle: true,
    responsive: true,
    seekable: true,
  })
  const [theme, setTheme] = useState<Theme>(
    () => queryValue('theme', ['dark', 'light', 'auto']) ?? 'dark',
  )
  const [mode, setMode] = useState<PlayerMode>(
    () => queryValue('mode', ['mini', 'full']) ?? 'full',
  )
  const [playMode, setPlayMode] = useState<PlayMode>(
    () =>
      queryValue('playMode', [
        'order',
        'orderLoop',
        'singleLoop',
        'shufflePlay',
      ]) ?? 'orderLoop',
  )
  const [locale, setLocale] = useState<LocaleId>(
    () => queryValue('locale', ['en_US', 'en_GB', 'zh_CN']) ?? 'en_GB',
  )
  const [persist, setPersist] = useState(false)
  const [fade, setFade] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const pushLog = (entry: string) =>
    setLog((l) =>
      [`${new Date().toLocaleTimeString()} ${entry}`, ...l].slice(0, 12),
    )

  const toggle = (key: keyof MusicPlayerUIProps) =>
    setUi((s) => ({ ...s, [key]: !s[key] }))

  // Seed playlist / lyric overlay visibility from ?playlist=1&lyric=1 by
  // activating the player's own toggles once on mount.
  useEffect(() => {
    if (!flag('playlist') && !flag('lyric')) return
    const id = requestAnimationFrame(() => {
      const root = document.querySelector('.trmp-root')
      if (!root) return
      if (flag('playlist')) {
        root.querySelector<HTMLElement>('button[aria-controls]')?.click()
      }
      if (flag('lyric')) {
        root
          .querySelector<HTMLElement>('button[aria-label="Toggle lyrics"]')
          ?.click()
      }
    })
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <main>
      <h1>tailwind-react-music-player v5</h1>

      <fieldset>
        <legend>Player props</legend>
        <label htmlFor="pf-theme">
          theme{' '}
          <select
            id="pf-theme"
            data-testid="pf-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            <option>dark</option>
            <option>light</option>
            <option>auto</option>
          </select>
        </label>
        <label htmlFor="pf-mode">
          mode{' '}
          <select
            id="pf-mode"
            data-testid="pf-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as PlayerMode)}
          >
            <option>mini</option>
            <option>full</option>
          </select>
        </label>
        <label htmlFor="pf-play-mode">
          playMode{' '}
          <select
            id="pf-play-mode"
            data-testid="pf-play-mode"
            value={playMode}
            onChange={(e) => setPlayMode(e.target.value as PlayMode)}
          >
            <option>order</option>
            <option>orderLoop</option>
            <option>singleLoop</option>
            <option>shufflePlay</option>
          </select>
        </label>
        <label htmlFor="pf-locale">
          locale{' '}
          <select
            id="pf-locale"
            data-testid="pf-locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value as LocaleId)}
          >
            <option>en_US</option>
            <option>en_GB</option>
            <option>zh_CN</option>
          </select>
        </label>
        <label htmlFor="pf-persist">
          <input
            id="pf-persist"
            data-testid="pf-persist"
            type="checkbox"
            aria-label="persist"
            checked={persist}
            onChange={() => setPersist((v) => !v)}
          />{' '}
          persist
        </label>
        <label htmlFor="pf-fade">
          <input
            id="pf-fade"
            data-testid="pf-fade"
            type="checkbox"
            aria-label="volumeFade"
            checked={fade}
            onChange={() => setFade((v) => !v)}
          />{' '}
          volumeFade
        </label>
        <div className="toggles">
          {TOGGLES.map((key) => (
            <label key={key} htmlFor={`pf-${key}`}>
              <input
                id={`pf-${key}`}
                data-testid={`pf-${key}`}
                type="checkbox"
                aria-label={key}
                checked={!!ui[key]}
                onChange={() => toggle(key)}
              />{' '}
              {key}
            </label>
          ))}
        </div>
      </fieldset>

      <section>
        <h2>Imperative handle</h2>
        <button type="button" onClick={() => playerRef.current?.togglePlay()}>
          togglePlay()
        </button>
        <button type="button" onClick={() => playerRef.current?.next()}>
          next()
        </button>
        <button type="button" onClick={() => playerRef.current?.volumeBy(-0.1)}>
          volume -10%
        </button>
        <button
          type="button"
          onClick={() =>
            pushLog(`audio=${playerRef.current?.audio?.tagName ?? 'null'}`)
          }
        >
          handle.audio
        </button>
        <button type="button" onClick={() => void playerRef.current?.destroy()}>
          destroy()
        </button>
      </section>

      <section>
        <h2>Custom UI via useMusicPlayer</h2>
        <CustomPlayer />
      </section>

      <section>
        <h2>Event log</h2>
        <ul className="event-log">
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>

      <MusicPlayer
        ref={playerRef}
        audioLists={audioList}
        autoPlay={
          query.has('autoplay') ? query.get('autoplay') === '1' : undefined
        }
        theme={theme}
        mode={mode}
        playMode={playMode}
        onThemeChange={setTheme}
        onModeChange={setMode}
        onPlayModeChange={setPlayMode}
        locale={locale}
        persist={persist}
        volumeFade={fade ? { fadeIn: 800, fadeOut: 600 } : undefined}
        onPlay={(i) => pushLog(`onPlay ${eventInfo(i)}`)}
        onPause={(i) => pushLog(`onPause ${eventInfo(i)}`)}
        onEnded={(i) => pushLog(`onEnded ${eventInfo(i)}`)}
        onError={(e) => pushLog(`onError ${e ? 'error' : ''}`)}
        onTrackChange={(i) => pushLog(`onTrackChange ${eventInfo(i)}`)}
        onTracksChange={(t) => pushLog(`onTracksChange ${t.length} tracks`)}
        onPlaylistToggle={(open) => pushLog(`onPlaylistToggle ${open}`)}
        onDestroyed={() => pushLog('onDestroyed')}
        {...ui}
      />
    </main>
  )
}
