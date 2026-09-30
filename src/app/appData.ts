import { createContext, useContext } from 'react'
import type { Book } from '../books/types.ts'

export interface AppData {
  books: Book[]
  /** The address of each stored cover picture, by book id; a book without one shows the cover the app draws. */
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

/** One book of the library by its id, with the ways to change it. */
export function useBook(bookId: string) {
  const { books, covers, saveBook, deleteBook } = useAppData()
  return { book: books.find((candidate) => candidate.id === bookId), cover: covers.get(bookId), books, saveBook, deleteBook }
}
