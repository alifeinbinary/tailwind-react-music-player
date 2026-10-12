/**
 * Package smoke test:
 *  1. `npm pack` the repo into a temp dir
 *  2. install the tarball into a scratch consumer project
 *  3. verify ESM runtime import shape
 *  4. typecheck a consumer.tsx under bundler AND node16 resolution
 *  5. assert the tarball file list is exactly the expected publish set
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const tmp = mkdtempSync(join(tmpdir(), 'trmp-pack-'))
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit' })
const out = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8' })

try {
  // build must be fresh so dist/ matches what would be published
  run('yarn', ['build'], root)

  const packLine = out(
    'npm',
    ['pack', '--pack-destination', tmp],
    root,
  ).trim()
  const tarball = join(tmp, packLine.split('\n').at(-1))
  console.warn('tarball:', tarball)

  // exact file list
  const files = out('tar', ['-tzf', tarball], tmp)
    .trim()
    .split('\n')
    .map((f) => f.replace(/^package\//, ''))
    .sort()
  const expected = [
    'LICENCE',
    'MIGRATION.md',
    'README.md',
    'THIRD_PARTY_LICENSES.md',
    'dist/index.d.ts',
    'dist/index.js',
    'dist/styles.css',
    'package.json',
  ].sort()
  if (JSON.stringify(files) !== JSON.stringify(expected)) {
    console.error('unexpected tarball contents:')
    console.error(files.join('\n'))
    process.exit(1)
  }
  console.warn('tarball contents OK:', files.join(', '))

  // consumer project
  const consumer = join(tmp, 'consumer')
  mkdirSync(consumer)
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'consumer', type: 'module', version: '1.0.0' }),
  )
  run(
    'npm',
    [
      'install',
      '--prefer-offline',
      '--no-audit',
      '--no-fund',
      tarball,
      'react@19',
      'react-dom@19',
      'typescript',
      '@types/react',
      '@types/react-dom',
    ],
    consumer,
  )

  // (a) runtime ESM import
  run(
    'node',
    [
      '-e',
      `import('tailwind-react-music-player').then(m => {
        if (typeof m.default !== 'function' || typeof m.useMusicPlayer !== 'function') {
          console.error('bad exports', typeof m.default, typeof m.useMusicPlayer)
          process.exit(1)
        }
        console.warn('ESM import OK:', typeof m.default, typeof m.useMusicPlayer)
      })`,
    ],
    consumer,
  )

  // (b) consumer.tsx typecheck
  writeFileSync(
    join(consumer, 'consumer.tsx'),
    `import { useRef } from 'react'
import MusicPlayer, {
  createLocale,
  useMusicPlayer,
  type AudioTrack,
  type MusicPlayerHandle,
  type MusicPlayerProps,
  type PlayerIcons,
} from 'tailwind-react-music-player'

const tracks: AudioTrack[] = [{ name: 'x', musicSrc: 'x.mp3' }]
const props: MusicPlayerProps = { audioLists: tracks }
const icons: Partial<PlayerIcons> = { play: null }
const locale = createLocale({ play: 'Go' })

export function App() {
  const ref = useRef<MusicPlayerHandle>(null)
  const player = useMusicPlayer({ audioLists: tracks, autoPlay: false })
  const h: MusicPlayerHandle | null = ref.current
  void h
  void player
  void icons
  void locale
  return (
    <>
      <MusicPlayer {...props} ref={ref} icons={icons} locale={locale} />
      <audio {...player.audioProps} />
    </>
  )
}
`,
  )
  const tsc = join(consumer, 'node_modules', '.bin', 'tsc')
  for (const [res, mod] of [
    ['bundler', 'esnext'],
    ['node16', 'node16'],
  ]) {
    run(
      tsc,
      [
        'consumer.tsx',
        '--strict',
        '--noEmit',
        // skipLibCheck intentionally omitted: default is false (strictest),
        // and `--skipLibCheck false` is not valid CLI syntax
        '--jsx',
        'react-jsx',
        '--moduleResolution',
        res,
        '--module',
        mod,
      ],
      consumer,
    )
    console.warn(`tsc ${res} OK`)
  }

  // (c) styles.css present and non-trivial
  const css = join(
    consumer,
    'node_modules',
    'tailwind-react-music-player',
    'dist',
    'styles.css',
  )
  if (!existsSync(css) || statSync(css).size <= 1024) {
    console.error('styles.css missing or < 1 kB')
    process.exit(1)
  }
  console.warn('styles.css OK:', statSync(css).size, 'bytes')
  console.warn('smoke:pack PASSED')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
