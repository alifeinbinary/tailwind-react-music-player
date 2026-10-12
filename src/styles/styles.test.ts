import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Compiles src/styles/index.css with the Tailwind CLI and returns the CSS. */
const compile = (): string => {
  const out = join(mkdtempSync(join(tmpdir(), 'trmp-')), 'styles.css')
  execFileSync(
    'npx',
    ['tailwindcss', '-i', 'src/styles/index.css', '-o', out],
    { cwd: join(__dirname, '..', '..'), stdio: 'pipe' },
  )
  return readFileSync(out, 'utf8')
}

describe('compiled styles', () => {
  const css = compile()

  it('emits only --trmp-* theme vars (internal --tw-* utility vars allowed)', () => {
    const props = new Set(css.match(/--[a-zA-Z][a-zA-Z0-9-]*/g) ?? [])
    for (const p of props) {
      // Tailwind v4 prefix() covers theme vars + class names only;
      // --tw-* are private per-utility internals (upstream #17195).
      if (p.startsWith('--tw-')) continue
      expect(p).toMatch(/^--trmp-/)
    }
    expect(css).not.toContain('--spacing:')
    expect(css).not.toMatch(
      /--(color|radius|text|shadow|ease|animate|duration)-[a-z]/,
    )
  })

  it('emits utilities that reference the tokens via var()', () => {
    expect(css).toContain('var(--trmp-color-panel)')
    expect(css).toContain('var(--trmp-color-primary)')
  })

  it('emits the light-theme token remap on data-theme', () => {
    expect(css).toMatch(/\.trmp-root\[data-theme=.?light/)
    expect(css).toMatch(/\.trmp-root\[data-layout=.?mobile/)
  })
})
