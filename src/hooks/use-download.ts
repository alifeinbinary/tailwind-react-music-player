import { useCallback } from 'react'
import { downloadFile, inferFilename } from '../core'
import type { DownloadInfo } from '../types'
import type { PlayerContext } from './player-context'

/**
 * Returns the `download()` action: awaits `onBeforeDownload`, falls back
 * to `{ src, filename: inferFilename(src) }`, invokes
 * `customDownloader ?? downloadFile`, then fires `onDownload` after
 * completion.
 */
export function useDownload(ctx: PlayerContext): () => Promise<void> {
  const { getLatest, getAudioInfo } = ctx
  return useCallback(async (): Promise<void> => {
    const l = getLatest()
    const info = getAudioInfo()
    const currentSrc = l.state.src
    if (!currentSrc) return
    const before = await l.options.onBeforeDownload?.(info)
    const request: DownloadInfo = before ?? {
      src: currentSrc,
      filename: inferFilename(currentSrc),
    }
    if (!request.src) request.src = currentSrc
    if (l.options.customDownloader) {
      l.options.customDownloader(request)
    } else {
      downloadFile(request)
    }
    l.options.onDownload?.(info, request)
  }, [getLatest, getAudioInfo])
}
