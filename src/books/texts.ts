import { cardDate, dayMonth, dayOf, fullDate, yearOf } from './dates.ts'
import type { Tab } from './library.ts'
import type { BookAction } from './status.ts'
import type { Book, BookNote, BookStatus, Day } from './types.ts'

export const STATUS_LABELS: Record<BookStatus, string> = {
  want: 'Okumak istiyorum',
  reading: 'Okuyorum',
  read: 'Okudum',
  abandoned: 'Yarım bıraktım',
}

export const TAB_LABELS: Record<Tab, string> = { reading: 'Okuyorum', want: 'Okumak istiyorum', read: 'Okudum' }

export const EMPTY_TAB: Record<Tab, string> = {
  reading: 'Şu an okuduğun bir kitap yok.',
  want: 'Okumak istediğin kitapları buraya ekle.',
  read: 'Bitirdiğin kitaplar burada birikir.',
}

export const ACTION_LABELS: Record<BookAction, string> = {
  start: 'Okumaya başla',
  finish: 'Bitirdim',
  abandon: 'Yarım bıraktım',
  restart: 'Tekrar başla',
}

export const KIND_LABELS: Record<BookNote['kind'], string> = { note: 'Not', quote: 'Alıntı' }

export const authorLine = (book: Pick<Book, 'authors'>): string => book.authors.join(', ')

/** The quiet line on a library card: "12 Eylül’de başladın · 3 not". Notes and quotes are counted together. */
export function cardInfo(book: Book, today: Day): string {
  return [cardDate(book, today), book.notes.length > 0 && `${book.notes.length} not`].filter(Boolean).join(' · ')
}

/** "s. 612 · 26 Eylül" over a note; the year is said only when it is not this one. */
export function noteMeta(note: BookNote, today: Day): string {
  const day = dayOf(note.createdAt)
  return [note.page !== undefined && `s. ${note.page}`, yearOf(day) === yearOf(today) ? dayMonth(day) : fullDate(day)].filter(Boolean).join(' · ')
}
