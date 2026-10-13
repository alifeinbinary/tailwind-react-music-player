import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from 'playwright/test'

// Baselines are generated on Linux (see e2e/README or the update-snapshots
// workflow). On other platforms, skip a state if its baseline is missing.
const hasBaseline = (file: string, arg: string) =>
  fs.existsSync(
    path.join(
      'e2e/__screenshots__',
      test.info().project.name,
      file,
      `${arg}.png`,
    ),
  )

const openPlayer = async (page: import('playwright/test').Page, qs: string) => {
  await page.goto(`/?${qs}&autoplay=0`)
  await expect(page.locator('.trmp-root')).toBeAttached()
  // wait until at least one fixed-position child is visible
  await expect(page.locator('.trmp-root > *').first()).toBeVisible()
  // ?playlist=1 / ?lyric=1 are seeded by a rAF click in the demo app — wait
  // for the requested surface to finish opening before measuring the clip.
  if (qs.includes('playlist=1'))
    await expect(page.locator('.trmp-playlist')).toBeVisible()
  if (qs.includes('lyric=1'))
    await expect(page.locator('.trmp-lyric')).toBeVisible()
}

// .trmp-root is a zero-height container (children are position:fixed), so a
// plain element screenshot has no size — clip to the union of its visible
// children instead. This still captures exactly the player's surface.
const unionClip = async (page: import('playwright/test').Page) => {
  const kids = await page.locator('.trmp-root > *:visible').all()
  const boxes = await Promise.all(kids.map((k) => k.boundingBox()))
  const valid = boxes.filter(
    (b): b is NonNullable<typeof b> => !!b && b.width > 0 && b.height > 0,
  )
  const x0 = Math.min(...valid.map((b) => b.x))
  const y0 = Math.min(...valid.map((b) => b.y))
  const x1 = Math.max(...valid.map((b) => b.x + b.width))
  const y1 = Math.max(...valid.map((b) => b.y + b.height))
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

const shot = async (
  name: string,
  qs: string,
  page: import('playwright/test').Page,
) => {
  test.skip(
    process.platform !== 'linux' && !hasBaseline('visual.spec.ts', name),
    `no ${process.platform} baseline for ${name}`,
  )
  await openPlayer(page, qs)
  // The clip is fixed at capture time — wait until the union of the player's
  // surfaces stops changing (open animations, async mounts) before shooting.
  let prev: string | undefined
  await expect(async () => {
    const cur = JSON.stringify(await unionClip(page))
    const settled = cur === prev
    prev = cur
    expect(settled).toBe(true)
  }).toPass({ timeout: 5000 })
  const clip = await unionClip(page)
  expect(clip.width).toBeGreaterThan(0)
  expect(clip.height).toBeGreaterThan(0)
  await expect(page).toHaveScreenshot(`${name}.png`, { clip })
}

test.describe('visual states (desktop)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop only')

  test('mini dark', async ({ page }) =>
    shot('mini-dark', 'theme=dark&mode=mini', page))
  test('mini light', async ({ page }) =>
    shot('mini-light', 'theme=light&mode=mini', page))
  test('full dark', async ({ page }) =>
    shot('full-dark', 'theme=dark&mode=full', page))
  test('full light', async ({ page }) =>
    shot('full-light', 'theme=light&mode=full', page))
  test('full dark + playlist', async ({ page }) =>
    shot('full-dark-playlist', 'theme=dark&mode=full&playlist=1', page))
  test('full light + playlist', async ({ page }) =>
    shot('full-light-playlist', 'theme=light&mode=full&playlist=1', page))
  test('full dark + lyric', async ({ page }) =>
    shot('full-dark-lyric', 'theme=dark&mode=full&lyric=1', page))
  test('glass', async ({ page }) =>
    shot('glass', 'theme=dark&mode=full&glass=1', page))
})

test.describe('visual states (mobile)', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only')

  test('mini', async ({ page }) => shot('m-mini', 'mode=mini', page))
  test('full dark', async ({ page }) =>
    shot('m-full-dark', 'theme=dark&mode=full', page))
  test('full light', async ({ page }) =>
    shot('m-full-light', 'theme=light&mode=full', page))
  test('full + playlist', async ({ page }) =>
    shot('m-full-playlist', 'mode=full&playlist=1', page))
})
