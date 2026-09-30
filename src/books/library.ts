import { yearOf } from './dates.ts'
import type { Book, BookNote, BookStatus, Day } from './types.ts'

/** The library's three tabs; books given up are listed with the finished ones. */
export type Tab = 'reading' | 'want' | 'read'
export const TABS: Tab[] = ['reading', 'want', 'read']

export const tabOf = (status: BookStatus): Tab => (status === 'abandoned' ? 'read' : status)

export function tabCounts(books: readonly Book[]): Record<Tab, number> {
  const counts = { reading: 0, want: 0, read: 0 }
  for (const book of books) counts[tabOf(book.status)] += 1
  return counts
}

/** The tab a fresh visit opens on: the first one that has a book. */
export function initialTab(books: readonly Book[]): Tab {
  const counts = tabCounts(books)
  return TABS.find((tab) => counts[tab] > 0) ?? 'reading'
}

/** The library with the book in it: in place when it was there already, otherwise at the end. */
export function withBook(books: readonly Book[], book: Book): Book[] {
  return books.some((other) => other.id === book.id) ? books.map((other) => (other.id === book.id ? book : other)) : [...books, book]
}

const newest = (a: string, b: string) => (a === b ? 0 : a < b ? 1 : -1)

// What each tab is ordered by; `want` has no date of its own and goes by when the book was added.
const tabDate = (book: Book, tab: Tab) => (tab === 'reading' ? book.startedAt : tab === 'read' ? book.finishedAt : undefined)

/** A tab's books, newest first; a book without the date goes last, and books added later come first on a tie. */
export function booksOfTab(books: readonly Book[], tab: Tab): Book[] {
  return books
    .filter((book) => tabOf(book.status) === tab)
    .sort((a, b) => {
      const [dayA, dayB] = [tabDate(a, tab), tabDate(b, tab)]
      if (dayA !== dayB) return dayA === undefined ? 1 : dayB === undefined ? -1 : newest(dayA, dayB)
      return newest(a.createdAt, b.createdAt)
    })
}

/** "Bu yıl n kitap": finished, not given up, with a finishing day in the year of `today`. */
export function finishedThisYear(books: readonly Book[], today: Day): number {
  return books.filter((book) => book.status === 'read' && book.finishedAt !== undefined && yearOf(book.finishedAt) === yearOf(today)).length
}

export const sortedNotes = (book: Book): BookNote[] => [...book.notes].sort((a, b) => newest(a.createdAt, b.createdAt))

/** "Son notun": the newest note or quote of the whole library. */
export function latestNote(books: readonly Book[]): { book: Book; note: BookNote } | undefined {
  let latest: { book: Book; note: BookNote } | undefined
  for (const book of books) {
    for (const note of book.notes) {
      if (!latest || note.createdAt > latest.note.createdAt) latest = { book, note }
    }
  }
  return latest
}
