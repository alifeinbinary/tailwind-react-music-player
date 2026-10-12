import { describe, expect, it, vi } from 'vitest'
import { downloadFile, inferFilename } from './download'

describe('inferFilename', () => {
  it.each([
    ['song.mp3', 'song.mp3'],
    ['dir/song.mp3?v=1', 'song.mp3'],
    ['https://x/a/b/song.mp3', 'song.mp3'],
    ['https://x/song.mp3?v=2#t=1', 'song.mp3'],
    ['https://x/a%20b.mp3', 'a b.mp3'],
    ['https://x/', 'audio'],
    ['https://x', 'audio'],
    ['', 'audio'],
    ['https://x/%E0%A4%A', '%E0%A4%A'], // undecodable escapes fall back to raw segment
    ['https://x/', 'custom-fallback', 'custom-fallback'],
  ] as [string, string, string?][])(
    'inferFilename(%s)',
    (src, expected, fallback) => {
      expect(
        fallback === undefined
          ? inferFilename(src)
          : inferFilename(src, fallback),
      ).toBe(expected)
    },
  )
})

describe('downloadFile', () => {
  it('creates, clicks and removes an anchor', () => {
    const doc = document.implementation.createHTMLDocument()
    const click = vi.fn()
    const realCreate = doc.createElement.bind(doc)
    vi.spyOn(doc, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'a')
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(click)
      return el
    })
    downloadFile({ src: 'https://x/song.mp3', filename: 'nice.mp3' }, doc)
    expect(click).toHaveBeenCalledOnce()
    expect(doc.body.querySelector('a')).toBeNull()
  })

  it('sets href, download and rel attributes', () => {
    const doc = document.implementation.createHTMLDocument()
    let captured: HTMLAnchorElement | undefined
    const realCreate = doc.createElement.bind(doc)
    vi.spyOn(doc, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'a') {
        captured = el as HTMLAnchorElement
        vi.spyOn(captured, 'click').mockImplementation(() => {})
      }
      return el
    })
    downloadFile({ src: 'https://x/dir/track.flac' }, doc)
    expect(captured).toBeDefined()
    expect(captured!.getAttribute('href')).toBe('https://x/dir/track.flac')
    expect(captured!.getAttribute('download')).toBe('track.flac')
    expect(captured!.getAttribute('rel')).toBe('noopener')
  })
})
