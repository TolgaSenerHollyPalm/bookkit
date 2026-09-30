import { toDay } from './dates.ts'
import type { Book, BookStatus, Day, Rating } from './types.ts'

export type BookAction = 'start' | 'finish' | 'abandon' | 'restart'

/** What a book's page offers in each state; a finished book only changes through its edit form. */
export const ACTIONS: Record<BookStatus, BookAction[]> = {
  want: ['start'],
  reading: ['finish', 'abandon'],
  read: [],
  abandoned: ['restart'],
}

// Without the keys rather than with undefined in them: that is how the record is stored and backed up.
function omit(book: Book, ...keys: ('startedAt' | 'finishedAt' | 'rating')[]): Book {
  const copy = { ...book }
  for (const key of keys) delete copy[key]
  return copy
}

/** The one place a book changes state; the edit form goes through it too. */
export function applyAction(book: Book, action: BookAction, today: Day): Book {
  switch (action) {
    case 'start':
      return { ...book, status: 'reading', startedAt: today }
    case 'finish':
      return { ...book, status: 'read', finishedAt: today }
    case 'abandon':
      return omit({ ...book, status: 'abandoned', finishedAt: today }, 'rating')
    case 'restart':
      return omit({ ...book, status: 'reading', startedAt: today }, 'finishedAt', 'rating')
  }
}

/** A state picked in the edit form. Leaving "Okudum" for "Okuyorum" is a restart: the caller asks first. */
export function changeStatus(book: Book, status: BookStatus, today: Day): Book {
  if (status === book.status) return book
  switch (status) {
    case 'want':
      return omit({ ...book, status }, 'startedAt', 'finishedAt', 'rating')
    case 'reading':
      return applyAction(book, book.status === 'want' ? 'start' : 'restart', today)
    case 'read':
      // Straight from the wish list, or from a book given up: no finishing day is made up for it.
      return book.status === 'reading' ? applyAction(book, 'finish', today) : { ...book, status }
    case 'abandoned':
      return book.status === 'reading' ? applyAction(book, 'abandon', today) : omit({ ...book, status }, 'rating')
  }
}

export interface NewBook {
  id: string
  title: string
  authors: string[]
  isbn?: string
  status: 'want' | 'reading' | 'read'
  finishedAt?: Day // only for 'read', and optional there: a book read years ago must not count for this year
  coverUrl?: string
  source?: Book['source']
}

export function newBook(input: NewBook, now: Date): Book {
  const stamp = now.toISOString()
  const book: Book = { id: input.id, title: input.title, authors: input.authors, status: input.status, notes: [], createdAt: stamp, updatedAt: stamp }
  // Set one by one, so a field the caller left undefined never becomes a key of the stored record.
  if (input.isbn) book.isbn = input.isbn
  if (input.coverUrl) book.coverUrl = input.coverUrl
  if (input.source) book.source = input.source
  if (input.status === 'reading') book.startedAt = toDay(now)
  if (input.status === 'read' && input.finishedAt) book.finishedAt = input.finishedAt
  return book
}

/** Only a finished book has a rating; the same star again takes it back. */
export function rateBook(book: Book, stars: Rating): Book {
  if (book.status !== 'read') return book
  return book.rating === stars ? omit(book, 'rating') : { ...book, rating: stars }
}

/** Marks a change the user made; a restore from a backup never goes through here. */
export const stampBook = (book: Book, now: Date): Book => ({ ...book, updatedAt: now.toISOString() })

/** What is wrong with the dates of an edit form, in the words shown under the fields. */
export function dateProblems({ startedAt, finishedAt }: Pick<Book, 'startedAt' | 'finishedAt'>, today: Day): string[] {
  const problems: string[] = []
  if (startedAt && finishedAt && finishedAt < startedAt) problems.push('Bitirme tarihi başlama tarihinden önce olamaz.')
  if ([startedAt, finishedAt].some((day) => day !== undefined && day > today)) problems.push('İleri bir tarih seçilemez.')
  return problems
}
