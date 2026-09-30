import { createContext, useContext } from 'react'
import type { Book } from '../books/types.ts'
import { onlineCover } from '../covers/download.ts'

export interface AppData {
  books: Book[]
  /** The address of each stored cover picture, by book id; `coverOf` is what a screen shows. */
  covers: ReadonlyMap<string, string>
  /** Stores a book, adding it when it is new, and stamps it with the time. */
  saveBook: (book: Book) => void
  deleteBook: (bookId: string) => void
}

export const AppDataContext = createContext<AppData | null>(null)

export function useAppData(): AppData {
  const data = useContext(AppDataContext)
  if (!data) throw new Error('useAppData must be used inside <AppDataProvider>')
  return data
}

/** The picture to show for a book: its stored cover, or one its source only lets be shown; without either the app draws one. */
export const coverOf = (covers: AppData['covers'], book: Book): string | undefined => covers.get(book.id) ?? onlineCover(book)

/** One book of the library by its id, with the ways to change it. */
export function useBook(bookId: string) {
  const { books, covers, saveBook, deleteBook } = useAppData()
  const book = books.find((candidate) => candidate.id === bookId)
  return { book, cover: book && coverOf(covers, book), books, saveBook, deleteBook }
}
