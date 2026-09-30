import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { RestoreCount, RestoreMode } from 'kitshelf-ui/backup/format.ts'
import { planRestore, type KitData } from '../backup/restorePlan.ts'
import type { Book } from '../books/types.ts'
import { DATABASE_NAME } from '../kit.ts'
import { DATA_VERSION, migrateBook } from './migrations.ts'

/** A cover picture as it was downloaded; `url` is where it came from. */
export interface StoredCover {
  bytes: ArrayBuffer // not a Blob: Safari's IndexedDB has had trouble storing Blobs, and this was not tried on an iPhone
  type: string
  url: string
}

interface BookKitDB extends DBSchema {
  books: { key: string; value: Book }
  covers: { key: string; value: StoredCover } // keyed by the book's id
}

let connection: Promise<IDBPDatabase<BookKitDB>> | undefined
let waitingForAnotherTab = false

/** True while an upgrade is stuck behind an older copy of the app open in another tab or window. */
export const blockedByAnotherTab = () => waitingForAnotherTab

function database() {
  connection ??= openDB<BookKitDB>(DATABASE_NAME, DATA_VERSION, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        db.createObjectStore('books', { keyPath: 'id' })
        db.createObjectStore('covers')
        return
      }
      // An older device: every stored book takes the steps a backup of that age would (storage/migrations.ts).
      const books = tx.objectStore('books')
      for (const book of await books.getAll()) await books.put(migrateBook(book, oldVersion))
    },
    // An upgrade cannot run while an older copy of the app still holds the database open.
    blocked() {
      waitingForAnotherTab = true
    },
    blocking() {
      // Another tab wants to upgrade: let go of the database so it can, and reopen on the next call.
      const open = connection
      connection = undefined
      open?.then((db) => db.close()).catch(() => undefined)
    },
    terminated() {
      connection = undefined
    },
  })
  return connection
}

/** Lets go of the database, so deleting it is not blocked by our own connection. */
export async function closeDatabase(): Promise<void> {
  const open = connection
  connection = undefined
  await open?.then((db) => db.close()).catch(() => undefined)
}

export async function loadBooks(): Promise<Book[]> {
  const db = await database()
  return db.getAll('books')
}

export async function saveBook(book: Book): Promise<void> {
  const db = await database()
  await db.put('books', book)
}

/** Removes the book and, in the same transaction, the cover kept for it. */
export async function deleteBook(bookId: string): Promise<void> {
  const db = await database()
  const tx = db.transaction(['books', 'covers'], 'readwrite')
  await Promise.all([tx.objectStore('books').delete(bookId), tx.objectStore('covers').delete(bookId), tx.done])
}

export async function loadCovers(): Promise<Map<string, StoredCover>> {
  const db = await database()
  const store = db.transaction('covers').store
  const [ids, covers] = await Promise.all([store.getAllKeys(), store.getAll()])
  return new Map(ids.map((id, index) => [id, covers[index]]))
}

/** Keeps a downloaded cover, unless its book was deleted or pointed at another cover while it was on its way. */
export async function saveCover(bookId: string, cover: StoredCover): Promise<boolean> {
  const db = await database()
  const tx = db.transaction(['books', 'covers'], 'readwrite')
  const wanted = (await tx.objectStore('books').get(bookId))?.coverUrl === cover.url
  if (wanted) await tx.objectStore('covers').put(cover, bookId)
  await tx.done
  return wanted
}

export async function deleteCover(bookId: string): Promise<void> {
  const db = await database()
  await db.delete('covers', bookId)
}

/** Writes a backup in one transaction; a failure anywhere leaves the device as it was. */
export async function restoreBackup(data: KitData, mode: RestoreMode): Promise<RestoreCount[]> {
  const db = await database()
  const tx = db.transaction(['books', 'covers'], 'readwrite')
  const [books, covers] = [tx.objectStore('books'), tx.objectStore('covers')]
  // Read and planned inside the transaction; awaiting anything but its own requests would end it.
  const [stored, coverIds, storedCovers] = await Promise.all([books.getAll(), covers.getAllKeys(), covers.getAll()])
  const plan = planRestore({ books: stored, coverUrls: new Map(coverIds.map((id, index) => [id, storedCovers[index].url])) }, data, mode)
  await Promise.all([...(plan.clear ? [books.clear()] : []), ...plan.books.map((book) => books.put(book)), ...plan.staleCovers.map((id) => covers.delete(id)), tx.done])
  return plan.counts
}

/** Asks the browser not to clear our data when the device runs low on space. */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {
    // Not granted; the data is still stored, just without the guarantee.
  })
}
