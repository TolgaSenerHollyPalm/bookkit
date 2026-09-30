import type { Book } from '../books/types.ts'

/** The shape of the stored books: the IndexedDB version, and later a backup's dataVersion. */
export const DATA_VERSION = 1

type Step = (book: Record<string, unknown>) => Record<string, unknown>

// One step per version, oldest first: STEPS[n] turns a book of version n into one of version n + 1.
// The database upgrade and a backup's import both run them, so an old backup opens like an old device.
const STEPS: Record<number, Step> = {}

/** Brings a book stored under an older version up to date; throws for a version with no way forward. */
export function migrateBook(book: unknown, from: number, steps: Record<number, Step> = STEPS, to = DATA_VERSION): Book {
  if (!Number.isInteger(from) || from < 1 || from > to) throw new Error(`No migration from data version ${from}`)
  let current = book as Record<string, unknown>
  for (let version = from; version < to; version++) {
    const step = steps[version]
    if (!step) throw new Error(`No migration from data version ${version}`)
    current = step(current)
  }
  return current as unknown as Book
}
