import { sameBook } from '../books/match.ts'
import type { Book } from '../books/types.ts'
import type { FoundBook } from './results.ts'

/** The library's copy of a found book: one with any of its ISBNs, or the same title by the same first author. */
export const inLibrary = (books: readonly Book[], found: FoundBook): Book | undefined =>
  books.find((book) => (book.isbn !== undefined && found.isbns.includes(book.isbn)) || sameBook(book, found))
