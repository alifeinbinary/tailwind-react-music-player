import { AxeBuilder } from '@axe-core/playwright'
import { test, expect } from 'playwright/test'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa']

const scan = async (page: import('playwright/test').Page, qs: string) => {
  await page.goto(`/?${qs}`)
  await expect(page.locator('.trmp-root')).toBeAttached()
  // ?playlist=1 / ?lyric=1 are seeded by a rAF click in the demo app — wait
  // for the requested surface to finish opening.
  if (qs.includes('playlist=1'))
    await expect(page.locator('.trmp-playlist')).toBeVisible()
  if (qs.includes('lyric=1'))
    await expect(page.locator('.trmp-lyric')).toBeVisible()
  // Entrance animations fade opacity 0→1 — axe blends colors through
  // in-flight opacity and reports false contrast violations mid-animation.
  // Wait for finite animations to settle (spin/pulse loop forever).
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== 'running' ||
          (a.effect?.getComputedTiming().iterations ?? Infinity) === Infinity,
      ),
  )
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  expect(results.violations).toEqual([])
}

const states = [
  ['mini dark', 'theme=dark&mode=mini'],
  ['mini light', 'theme=light&mode=mini'],
  ['full dark', 'theme=dark&mode=full'],
  ['full light', 'theme=light&mode=full'],
  ['full dark + playlist', 'theme=dark&mode=full&playlist=1'],
  ['full light + playlist', 'theme=light&mode=full&playlist=1'],
  ['full dark + lyric', 'theme=dark&mode=full&lyric=1'],
  ['glass', 'theme=dark&mode=full&glass=1'],
] as const

const mobileStates = [
  ['mini', 'mode=mini'],
  ['full dark', 'theme=dark&mode=full'],
  ['full light', 'theme=light&mode=full'],
  ['full + playlist', 'mode=full&playlist=1'],
] as const

test.describe('axe scans (desktop)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop only')

  for (const [name, qs] of states) {
    test(`zero violations: ${name}`, async ({ page }) => {
      await scan(page, qs)
    })
  }
})

test.describe('axe scans (mobile)', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only')

  for (const [name, qs] of mobileStates) {
    test(`zero violations: ${name}`, async ({ page }) => {
      await scan(page, qs)
    })
  }
})

test.describe('keyboard walkthrough', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop only')

  test('mini -> full -> tab through controls -> playlist escape', async ({
    page,
  }) => {
    await page.goto('/?theme=dark&mode=mini&autoplay=0')
    const mini = page.locator('.trmp-mini button').first()
    // tab from the start of the page eventually reaches the mini button
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      if (await mini.evaluate((el) => el === document.activeElement)) break
    }
    await expect(mini).toBeFocused()
    await page.keyboard.press('Enter')
    const panel = page.locator('.trmp-panel')
    await expect(panel).toBeVisible()
    // collect accessible names while tabbing through the panel's controls
    const labels: string[] = []
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      const label = await page.evaluate(() => {
        const el = document.activeElement
        return el?.getAttribute('aria-label') ?? ''
      })
      const inPanel = await page.evaluate(
        (root) => root?.contains(document.activeElement) ?? false,
        await panel.elementHandle(),
      )
      if (!inPanel) break
      if (label) labels.push(label)
    }
    expect(labels).toEqual(expect.arrayContaining(['Play', 'Playlist']))
    expect(labels).toContain('Play')
    expect(labels).toContain('Previous track')
    expect(labels).toContain('Next track')
    expect(labels).toContain('Playlist')
    // open playlist and close with Escape, focus returns to the toggle
    const playlistToggle = page.locator('button[aria-label="Playlist"]')
    await playlistToggle.focus()
    await page.keyboard.press('Enter')
    const playlist = page.locator('.trmp-playlist')
    await expect(playlist).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(playlist).toBeHidden()
    await expect(playlistToggle).toBeFocused()
  })
})

test.describe('mobile keyboard/focus', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only')

  test('escape in mobile full mode minimises back to mini', async ({
    page,
  }) => {
    await page.goto('/?theme=dark&mode=full&autoplay=0')
    const dialog = page.locator('.trmp-mobile')
    await expect(dialog).toBeVisible()
    // focus must be inside the dialog for its keydown handler to see Escape
    await expect(dialog).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    const mini = page.locator('.trmp-mini button').first()
    await expect(mini).toBeFocused()
  })
})
