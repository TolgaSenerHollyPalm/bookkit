import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { withBook } from '../books/library.ts'
import { stampBook } from '../books/status.ts'
import type { Book } from '../books/types.ts'
import { blockedByAnotherTab, deleteBook as removeBook, loadBooks, requestPersistentStorage, saveBook as storeBook } from '../storage/db.ts'
import { AppDataContext } from './appData.ts'
import styles from './AppDataProvider.module.css'

// The provider is mounted once, so module-level state is enough: the books as they are right now,
// which two changes in a row build on rather than on the last render.
let current: Book[] = []

/** Loads the books from IndexedDB once, then keeps them in memory and writes every change back. */
export default function AppDataProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>()
  const [loadFailed, setLoadFailed] = useState(false)
  const [slowLoad, setSlowLoad] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  const apply = useCallback((next: Book[]) => {
    current = next
    setBooks(next)
  }, [])

  useEffect(() => {
    let active = true
    requestPersistentStorage()
    loadBooks()
      .then((stored) => {
        if (active) apply(stored)
      })
      .catch((error: unknown) => {
        console.error(error)
        if (active) setLoadFailed(true)
      })
    return () => {
      active = false
    }
  }, [apply])

  // Opening takes a moment; if it takes this long, something is in the way and the user should know.
  useEffect(() => {
    if (books) return undefined
    const timer = setTimeout(() => setSlowLoad(true), 5000)
    return () => clearTimeout(timer)
  }, [books])

  const report = useCallback((error: unknown) => {
    console.error(error)
    setSaveFailed(true)
  }, [])

  const saveBook = useCallback(
    (changed: Book) => {
      const book = stampBook(changed, new Date())
      apply(withBook(current, book))
      storeBook(book).catch(report)
    },
    [apply, report],
  )

  const deleteBook = useCallback(
    (bookId: string) => {
      apply(current.filter((book) => book.id !== bookId))
      removeBook(bookId).catch(report)
    },
    [apply, report],
  )

  const value = useMemo(() => books && { books, saveBook, deleteBook }, [books, saveBook, deleteBook])

  if (loadFailed) {
    return <p className={styles.message}>Kayıtlı veriler açılamadı. Uygulamayı kapatıp yeniden aç.</p>
  }
  if (!value) {
    if (slowLoad && blockedByAnotherTab()) {
      return (
        <p className={styles.message}>
          Uygulama başka bir sekmede ya da pencerede daha eski bir sürümle açık. Oradaki sekmeyi kapatıp bu sayfayı
          yenile.
        </p>
      )
    }
    return null
  }

  return (
    <AppDataContext value={value}>
      {saveFailed && (
        <p className={styles.warning} role="alert">
          Son değişiklik kaydedilemedi. Telefonda yer kalmamış olabilir.
        </p>
      )}
      {children}
    </AppDataContext>
  )
}
