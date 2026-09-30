import type { Book } from '../books/types.ts'

export type Fetcher = (url: string, init: { signal: AbortSignal }) => Promise<Response>

/** What asking for a cover came to. */
export type CoverAnswer =
  | { kind: 'cover'; bytes: ArrayBuffer; type: string }
  | { kind: 'none' } // the source has no cover at this address: not worth asking again
  | { kind: 'later' } // no answer this time: the connection, or the server

export const TIMEOUT_MS = 20_000
const COVER_HOSTS = ['covers.openlibrary.org']
// Open Library's stand-in for a missing cover is a 43-byte GIF; no real cover is this small.
const SMALLEST_COVER = 200

/** A cover address the app itself could have written. A backup file can hold any address; only these are fetched. */
export function isCoverAddress(url: string): boolean {
  try {
    const address = new URL(url)
    return address.protocol === 'https:' && COVER_HOSTS.includes(address.hostname)
  } catch {
    return false
  }
}

// Google sends its covers without a CORS header: a page may show them, but cannot read them to keep a copy.
const SHOWN_ONLY_HOSTS = ['books.google.com']

/** The address of a cover that can only be shown straight from its source, while there is a connection. */
export function onlineCover(book: Pick<Book, 'coverUrl'>): string | undefined {
  try {
    const address = new URL(book.coverUrl ?? '')
    return address.protocol === 'https:' && SHOWN_ONLY_HOSTS.includes(address.hostname) ? address.href : undefined
  } catch {
    return undefined
  }
}

export async function downloadCover(url: string, fetcher: Fetcher = fetch): Promise<CoverAnswer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetcher(url, { signal: controller.signal })
    if (response.status === 404) return { kind: 'none' }
    const type = response.headers.get('content-type')?.split(';')[0].trim() ?? ''
    // Anything but a picture is a server in trouble or a Wi-Fi login page: the cover may still be there.
    if (!response.ok || !type.startsWith('image/')) return { kind: 'later' }
    const bytes = await response.arrayBuffer()
    return bytes.byteLength < SMALLEST_COVER ? { kind: 'none' } : { kind: 'cover', bytes, type }
  } catch {
    return { kind: 'later' }
  } finally {
    clearTimeout(timer)
  }
}

type Ids = { has(id: string): boolean }

/** The books whose cover is still to be fetched: `have` holds the ids with a stored cover, `tried` those asked in vain. */
export const wantingCover = (books: readonly Book[], have: Ids, tried: Ids): Book[] =>
  books.filter((book) => book.coverUrl !== undefined && isCoverAddress(book.coverUrl) && !have.has(book.id) && !tried.has(book.id))
