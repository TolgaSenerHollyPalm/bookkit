import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { withBook } from '../books/library.ts'
import { stampBook } from '../books/status.ts'
import type { Book } from '../books/types.ts'
import { downloadCover, wantingCover } from '../covers/download.ts'
import { blockedByAnotherTab, deleteBook as removeBook, deleteCover, loadBooks, loadCovers, requestPersistentStorage, saveBook as storeBook, saveCover, type StoredCover } from '../storage/db.ts'
import { AppDataContext } from './appData.ts'
import styles from './AppDataProvider.module.css'

// The provider is mounted once, so module-level state is enough: the books as they are right now,
// which two changes in a row build on rather than on the last render.
let current: Book[] = []
// One object address per stored cover, made when the cover arrives and handed back when it goes.
const coverAddresses = new Map<string, string>()
// The books whose cover was asked for in vain since the app opened or the connection came back.
const tried = new Set<string>()
let fetching = false

function keepCover(bookId: string, cover: StoredCover): void {
  const old = coverAddresses.get(bookId)
  if (old) URL.revokeObjectURL(old)
  coverAddresses.set(bookId, URL.createObjectURL(new Blob([cover.bytes], { type: cover.type })))
}

/** Loads the books and their covers from IndexedDB once, then keeps them in memory and writes every change back. */
export default function AppDataProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>()
  const [covers, setCovers] = useState<ReadonlyMap<string, string>>(() => new Map())
  const [loadFailed, setLoadFailed] = useState(false)
  const [slowLoad, setSlowLoad] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  const apply = useCallback((next: Book[]) => {
    current = next
    setBooks(next)
  }, [])

  const report = useCallback((error: unknown) => {
    console.error(error)
    setSaveFailed(true)
  }, [])

  // Downloads the covers the books name and the device lacks, one at a time, and lets the screens know.
  const fetchCovers = useCallback(async () => {
    if (fetching || !navigator.onLine) return
    fetching = true
    try {
      for (;;) {
        const book = wantingCover(current, coverAddresses, tried)[0]
        const url = book?.coverUrl
        if (!book || !url) break
        tried.add(book.id)
        const answer = await downloadCover(url)
        if (answer.kind === 'cover') {
          const cover = { bytes: answer.bytes, type: answer.type, url }
          if (await saveCover(book.id, cover)) {
            keepCover(book.id, cover)
            setCovers(new Map(coverAddresses))
          }
        } else if (answer.kind === 'none') {
          const mine = current.find((candidate) => candidate.id === book.id)
          if (mine?.coverUrl !== url) continue
          // Not stamped: the reader changed nothing, and a newer date would win over their edits in a backup merge.
          const { coverUrl: _none, ...without } = mine
          apply(withBook(current, without))
          storeBook(without).catch(report)
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      fetching = false
    }
  }, [apply, report])

  useEffect(() => {
    let active = true
    requestPersistentStorage()
    Promise.all([loadBooks(), loadCovers()])
      .then(([stored, storedCovers]) => {
        if (!active) return
        for (const [bookId, cover] of storedCovers) {
          // A cover without its book, or of an address the book no longer names, is left over: clear it away.
          if (stored.some((book) => book.id === bookId && book.coverUrl === cover.url)) keepCover(bookId, cover)
          else deleteCover(bookId).catch(console.error)
        }
        setCovers(new Map(coverAddresses))
        apply(stored)
        void fetchCovers()
      })
      .catch((error: unknown) => {
        console.error(error)
        if (active) setLoadFailed(true)
      })
    return () => {
      active = false
    }
  }, [apply, fetchCovers])

  // What could not be fetched is asked for again whenever the connection comes back.
  useEffect(() => {
    const retry = () => {
      tried.clear()
      void fetchCovers()
    }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [fetchCovers])

  // Opening takes a moment; if it takes this long, something is in the way and the user should know.
  useEffect(() => {
    if (books) return undefined
    const timer = setTimeout(() => setSlowLoad(true), 5000)
    return () => clearTimeout(timer)
  }, [books])

  const saveBook = useCallback(
    (changed: Book) => {
      const book = stampBook(changed, new Date())
      apply(withBook(current, book))
      storeBook(book).catch(report)
      void fetchCovers()
    },
    [apply, report, fetchCovers],
  )

  const deleteBook = useCallback(
    (bookId: string) => {
      apply(current.filter((book) => book.id !== bookId))
      const address = coverAddresses.get(bookId)
      if (address) {
        URL.revokeObjectURL(address)
        coverAddresses.delete(bookId)
        setCovers(new Map(coverAddresses))
      }
      removeBook(bookId).catch(report)
    },
    [apply, report],
  )

  const value = useMemo(() => books && { books, covers, saveBook, deleteBook }, [books, covers, saveBook, deleteBook])

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
