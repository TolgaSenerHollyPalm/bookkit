import { createContext, useContext } from 'react'
import type { Book } from '../books/types.ts'

export interface AppData {
  books: Book[]
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
