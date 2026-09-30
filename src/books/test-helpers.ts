import type { Book, BookNote } from './types.ts'

/** A book for tests: on the wish list, added on the morning of 1 September 2026, local time. */
export function book(fields: Partial<Book> = {}): Book {
  const added = new Date(2026, 8, 1, 9).toISOString()
  return { id: 'b1', title: 'Huzur', authors: ['Ahmet Hamdi Tanpınar'], status: 'want', notes: [], createdAt: added, updatedAt: added, ...fields }
}

export const note = (id: string, createdAt: string, fields: Partial<BookNote> = {}): BookNote => ({ id, kind: 'note', text: id, createdAt, ...fields })
