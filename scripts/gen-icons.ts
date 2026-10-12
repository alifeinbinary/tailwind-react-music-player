/**
 * Generates src/components/icons/icons.tsx from lucide-static SVGs.
 * Run via `yarn gen:icons`. Deterministic — safe to re-run.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ICONS_DIR = join(ROOT, 'node_modules', 'lucide-static', 'icons')
const OUT = join(ROOT, 'src', 'components', 'icons', 'icons.tsx')

/** Player icon key -> lucide-static icon file name. */
const MAPPING: Record<string, string> = {
  play: 'play',
  pause: 'pause',
  prev: 'skip-back',
  next: 'skip-forward',
  loading: 'loader-circle',
  volume: 'volume-2',
  mute: 'volume-x',
  download: 'download',
  reload: 'rotate-cw',
  lyric: 'mic-vocal',
  playlist: 'list-music',
  close: 'x',
  delete: 'trash-2',
  minimize: 'minimize-2',
  destroy: 'power',
  order: 'list-ordered',
  orderLoop: 'repeat',
  singleLoop: 'repeat-1',
  shuffle: 'shuffle',
  collapse: 'chevrons-down',
  empty: 'music-4',
  controller: 'headphones',
}

const pascal = (s: string): string =>
  s.replace(/(^|-)([a-z0-9])/g, (_, _d, c: string) => c.toUpperCase())

const camelAttr = (name: string): string =>
  name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

const tagRe = /<(path|circle|rect|line|polyline|polygon|ellipse)\s+([^>]*?)\/>/g
const attrRe = /([a-zA-Z-]+)="([^"]*)"/g

const innerJsx = (file: string): string => {
  const svg = readFileSync(join(ICONS_DIR, `${file}.svg`), 'utf8')
  const parts: string[] = []
  for (const m of svg.matchAll(tagRe)) {
    const attrs: string[] = []
    for (const a of m[2].matchAll(attrRe)) {
      attrs.push(`${camelAttr(a[1])}="${a[2]}"`)
    }
    parts.push(`<${m[1]} ${attrs.join(' ')} />`)
  }
  if (parts.length === 0) {
    throw new Error(`No shapes extracted from lucide icon "${file}"`)
  }
  return parts.join('')
}

const blocks = Object.entries(MAPPING).map(([key, file]) => {
  const name = `${pascal(key)}Icon`
  return `/** ${key} icon (lucide: ${file}). */\nexport const ${name} = (props: PlayerIconProps) => (\n  <Icon {...props}>${innerJsx(file)}</Icon>\n)`
})

const out = `// GENERATED FILE — do not edit. Regenerate with \`yarn gen:icons\`.
// Icons derived from lucide-static (ISC License,
// Copyright (c) Lucide Icons and Contributors). See THIRD_PARTY_LICENSES.md.
import type { ReactNode, SVGProps } from 'react'

export type PlayerIconProps = SVGProps<SVGSVGElement>

const Icon = ({
  children,
  ...props
}: PlayerIconProps & { children?: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    width="1em"
    height="1em"
    {...props}
  >
    {children}
  </svg>
)

${blocks.join('\n\n')}
`

writeFileSync(OUT, out)
console.warn(`wrote ${OUT} (${Object.keys(MAPPING).length} icons)`)
