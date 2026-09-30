import { parseIsbn } from '../books/isbn.ts'
import { fixCaps, hasTurkishLetters, respell, tidyName, tidyTitle, turkishTitle } from './spelling.ts'

/**
 * A book as Google Books lists it. Google's terms forbid changing, reordering or mixing what it answers, so its
 * rows are shown exactly as they come; only a book the reader adds is tidied, as their own record of it.
 */
export interface GoogleBook {
  id: string // Google's id for the volume
  title: string
  authors: string[]
  isbn?: string
  language?: string // two letters, e.g. "tr"
  coverUrl?: string // can be shown in an <img>, but not downloaded: Google sends no CORS header with it
  link: string // the book's page on Google Books, which every shown result has to link to
}

/** The key the build was given; without one Google Books is never asked and the screen does not offer it. */
export const googleKey = (): string | undefined => import.meta.env.VITE_GOOGLE_BOOKS_KEY || undefined

const FIELDS = 'items(id,volumeInfo(title,authors,industryIdentifiers,imageLinks/thumbnail,language))'
export const GOOGLE_TIMEOUT_MS = 8000

export function googleAddress(typed: string, key: string): string {
  const isbn = parseIsbn(typed)
  const params = new URLSearchParams({ q: isbn ? `isbn:${isbn}` : typed.trim(), maxResults: '20', printType: 'books', fields: FIELDS, key })
  return `https://www.googleapis.com/books/v1/volumes?${params}`
}

/** The volume's page on Google Books itself; the API's own links lead to the Play Store for books sold there. */
export const googlePage = (id: string): string => `https://books.google.com/books?id=${encodeURIComponent(id)}`

const record = (value: unknown): Record<string, unknown> | undefined => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined)
const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value : undefined)

function toGoogleBook(item: unknown): GoogleBook | undefined {
  const info = record(record(item)?.volumeInfo)
  const id = text(record(item)?.id)
  const title = text(info?.title)
  if (!info || !id || !title) return undefined
  const book: GoogleBook = { id, title, authors: Array.isArray(info.authors) ? info.authors.filter((name) => typeof name === 'string') : [], link: googlePage(id) }
  const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers.map(record) : []
  // ISBN_13 before ISBN_10; the list also holds other libraries' numbers, which are no ISBN.
  const isbn = ['ISBN_13', 'ISBN_10'].flatMap((type) => identifiers.filter((entry) => entry?.type === type).map((entry) => parseIsbn(String(entry?.identifier ?? '')))).find((found) => found !== undefined)
  if (isbn) book.isbn = isbn
  const language = text(info.language)
  if (language) book.language = language
  const thumbnail = text(record(info.imageLinks)?.thumbnail)
  // The API answers with http addresses, which an https page may not show.
  if (thumbnail) book.coverUrl = thumbnail.replace(/^http:/, 'https:')
  return book
}

/** The books of an answer, in Google's order. An answer without `items` found nothing. */
export function readGoogleAnswer(body: unknown): GoogleBook[] {
  const answer = record(body)
  if (!answer) throw new Error('Google Books answered without a list of books')
  const items = answer.items ?? []
  if (!Array.isArray(items)) throw new Error('Google Books answered without a list of books')
  return items.map(toGoogleBook).filter((book) => book !== undefined)
}

/** A refusal with its HTTP status: 429 means the day's shared quota is used up. */
export class GoogleRefusal extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Google Books answered ${status}`)
    this.status = status
  }
}

export type Fetcher = (url: string, init: { signal: AbortSignal }) => Promise<Response>

export async function searchGoogle(typed: string, key: string, cancelled: AbortSignal, fetcher: Fetcher = fetch): Promise<GoogleBook[]> {
  const controller = new AbortController()
  const stop = () => controller.abort()
  const timer = setTimeout(stop, GOOGLE_TIMEOUT_MS)
  cancelled.addEventListener('abort', stop)
  if (cancelled.aborted) stop()
  try {
    const response = await fetcher(googleAddress(typed, key), { signal: controller.signal })
    if (!response.ok) throw new GoogleRefusal(response.status)
    return readGoogleAnswer(await response.json())
  } finally {
    clearTimeout(timer)
    cancelled.removeEventListener('abort', stop)
  }
}

// Google's records carry HTML escapes here and there, some of them broken: "Maggie O&039;Farrell".
const unescaped = (text: string): string => text.replace(/&#?0*39;|&apos;/g, "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&')

/** The title and authors a Google book is added with: spelled by the rules the library's other books follow. */
export function tidyGoogleBook(book: GoogleBook, typed: string): { title: string; authors: string[] } {
  const turkish = book.language === 'tr' || hasTurkishLetters(book.title)
  const spelled = fixCaps(tidyTitle(unescaped(book.title)), turkish)
  const fromWords = parseIsbn(typed) === undefined
  const title = turkish ? turkishTitle(spelled) : spelled
  const authors = book.authors.map((name) => fixCaps(tidyName(unescaped(name)), turkish)).filter((name) => name !== '')
  return fromWords ? { title: respell(title, typed), authors: authors.map((name) => respell(name, typed)) } : { title, authors }
}
