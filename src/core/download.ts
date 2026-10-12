/** A file download request. */
export interface DownloadRequest {
  src: string
  filename?: string
  mimeType?: string
}

/**
 * Derives a filename from a URL's last path segment, ignoring query/hash.
 * Falls back to `fallback` when the segment is empty or undecodable.
 */
export function inferFilename(src: string, fallback = 'audio'): string {
  const noQuery = src.split(/[?#]/, 1)[0]
  const cleaned = noQuery.replace(/^[a-zA-Z][\w+.-]*:\/\//, '')
  const lastSlash = cleaned.lastIndexOf('/')
  const segment =
    lastSlash >= 0
      ? cleaned.slice(lastSlash + 1)
      : cleaned === noQuery
        ? cleaned
        : ''
  if (!segment) return fallback
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * Triggers a browser download by clicking a transient `<a download>`.
 * Cross-origin URLs may navigate instead of downloading — browsers ignore
 * the `download` attribute for them; no blob fetching is attempted.
 */
export function downloadFile(
  request: DownloadRequest,
  doc: Document = document,
): void {
  const anchor = doc.createElement('a')
  anchor.href = request.src
  anchor.download = request.filename ?? inferFilename(request.src)
  anchor.rel = 'noopener'
  doc.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
