import { readAnswer, searchAddress } from './openLibrary.ts'
import { cleanResults, type FoundBook } from './results.ts'

export const TIMEOUT_MS = 8000

export type Fetcher = (url: string, init: { signal: AbortSignal }) => Promise<Response>

/**
 * Asks Open Library and tidies what it answers. Rejects when the request fails, takes longer than eight
 * seconds, or `cancelled` fires because the reader has typed on.
 */
export async function searchBooks(typed: string, cancelled: AbortSignal, fetcher: Fetcher = fetch): Promise<FoundBook[]> {
  const controller = new AbortController()
  const stop = () => controller.abort()
  const timer = setTimeout(stop, TIMEOUT_MS)
  cancelled.addEventListener('abort', stop)
  if (cancelled.aborted) stop()
  try {
    const response = await fetcher(searchAddress(typed), { signal: controller.signal })
    if (!response.ok) throw new Error(`Open Library answered ${response.status}`)
    // Still under the timer: a stalled connection can hang while the body is read, too.
    return cleanResults(readAnswer(await response.json(), typed), typed)
  } finally {
    clearTimeout(timer)
    cancelled.removeEventListener('abort', stop)
  }
}
