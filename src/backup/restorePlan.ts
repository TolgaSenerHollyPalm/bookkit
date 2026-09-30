import type { RestoreCount, RestoreMode } from 'kitshelf-ui/backup/format.ts'
import { mergeById } from 'kitshelf-ui/backup/merge.ts'
import type { Book } from '../books/types.ts'

/** What a backup carries: the books, their notes inside them. Covers stay out; each book's `coverUrl` brings its own back. */
export interface KitData {
  books: Book[]
}

export interface RestorePlan {
  clear: boolean // replace: the books are emptied first
  books: Book[] // to write
  staleCovers: string[] // the ids of stored covers that no longer belong to their book
  counts: RestoreCount[]
}

const noteCount = (books: readonly Book[]) => books.reduce((sum, book) => sum + book.notes.length, 0)

/**
 * What a restore writes, worked out in one go so the transaction never waits between its reads and writes.
 * `coverUrls` holds, by book id, the address each stored cover was downloaded from.
 */
export function planRestore(local: { books: Book[]; coverUrls: ReadonlyMap<string, string> }, incoming: KitData, mode: RestoreMode): RestorePlan {
  const merged = mode === 'merge' ? mergeById(local.books, incoming.books) : undefined
  const after = merged ? merged.items : incoming.books
  // A cover stays while its book is there and still names the address it came from: thrown away offline,
  // it could not be fetched again.
  const kept = new Map(after.map((book) => [book.id, book.coverUrl]))
  const staleCovers = [...local.coverUrls].filter(([bookId, url]) => kept.get(bookId) !== url).map(([bookId]) => bookId)

  if (!merged) {
    const [books, notes] = [incoming.books.length, noteCount(incoming.books)]
    return {
      clear: true,
      books: incoming.books,
      staleCovers,
      counts: [
        { key: 'books', label: 'kitap', added: books, updated: 0, total: books },
        { key: 'notes', label: 'not', added: notes, updated: 0, total: notes },
      ],
    }
  }
  const onDevice = new Set(local.books)
  return {
    clear: false,
    // Only what is new or newer: the rest is on the device already.
    books: merged.items.filter((book) => !onDevice.has(book)),
    staleCovers,
    counts: [{ key: 'books', label: 'kitap', added: merged.added, updated: merged.updated, total: merged.items.length }],
  }
}
