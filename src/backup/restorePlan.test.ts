import { describe, expect, it } from 'vitest'
import { book, note } from '../books/test-helpers.ts'
import { planRestore } from './restorePlan.ts'

const COVER_A = 'https://covers.openlibrary.org/b/id/1-M.jpg?default=false'
const COVER_B = 'https://covers.openlibrary.org/b/id/2-M.jpg?default=false'
const at = (day: number) => `2026-09-${String(day).padStart(2, '0')}T10:00:00.000Z`
const noCovers = new Map<string, string>()

describe('planRestore: merge', () => {
  const local = { books: [book({ id: 'a', title: 'a here', updatedAt: at(10) }), book({ id: 'b', title: 'b here', updatedAt: at(20) })], coverUrls: noCovers }
  const incoming = { books: [book({ id: 'a', title: 'a there', updatedAt: at(15) }), book({ id: 'b', title: 'b there', updatedAt: at(1) }), book({ id: 'c', title: 'c', updatedAt: at(2) })] }
  const plan = planRestore(local, incoming, 'merge')

  it('writes only what is new or newer, and deletes nothing', () => {
    expect(plan.clear).toBe(false)
    expect(plan.books.map(({ title }) => title)).toEqual(['a there', 'c'])
  })

  it('counts the books added and updated, and how many the device ends up with', () => {
    expect(plan.counts).toEqual([{ key: 'books', label: 'kitap', added: 1, updated: 1, total: 3 }])
  })

  it('finds nothing to do when the device already has it all', () => {
    const again = planRestore(local, { books: local.books }, 'merge')
    expect(again.books).toEqual([])
    expect(again.counts).toEqual([{ key: 'books', label: 'kitap', added: 0, updated: 0, total: 2 }])
  })

  it('takes the newer copy of a book whole, notes and all', () => {
    const mine = book({ id: 'a', updatedAt: at(10), notes: [note('mine', at(9))] })
    const theirs = book({ id: 'a', updatedAt: at(15), notes: [note('theirs', at(14))] })
    expect(planRestore({ books: [mine], coverUrls: noCovers }, { books: [theirs] }, 'merge').books).toEqual([theirs])
  })

  it('keeps a cover whose book still names its address, and drops one whose book now names another or none', () => {
    const books = [book({ id: 'same', coverUrl: COVER_A, updatedAt: at(10) }), book({ id: 'changed', coverUrl: COVER_A, updatedAt: at(10) }), book({ id: 'lost', coverUrl: COVER_A, updatedAt: at(10) }), book({ id: 'untouched', coverUrl: COVER_A })]
    const coverUrls = new Map(books.map(({ id }) => [id, COVER_A]))
    const newer = { books: [book({ id: 'same', coverUrl: COVER_A, updatedAt: at(15) }), book({ id: 'changed', coverUrl: COVER_B, updatedAt: at(15) }), book({ id: 'lost', updatedAt: at(15) })] }
    expect(planRestore({ books, coverUrls }, newer, 'merge').staleCovers).toEqual(['changed', 'lost'])
  })

  it('leaves the cover alone when the device’s copy of the book is the newer one', () => {
    const books = [book({ id: 'a', coverUrl: COVER_A, updatedAt: at(20) })]
    const older = { books: [book({ id: 'a', coverUrl: COVER_B, updatedAt: at(1) })] }
    expect(planRestore({ books, coverUrls: new Map([['a', COVER_A]]) }, older, 'merge').staleCovers).toEqual([])
  })
})

describe('planRestore: replace', () => {
  const incoming = { books: [book({ id: 'x', notes: [note('n1', at(1)), note('q1', at(2), { kind: 'quote' })] }), book({ id: 'y', coverUrl: COVER_A })] }

  it('empties the books and writes the backup as it is', () => {
    const plan = planRestore({ books: [book({ id: 'a' })], coverUrls: noCovers }, incoming, 'replace')
    expect(plan.clear).toBe(true)
    expect(plan.books).toBe(incoming.books)
  })

  it('counts the books and, together, their notes and quotes', () => {
    expect(planRestore({ books: [], coverUrls: noCovers }, incoming, 'replace').counts).toEqual([
      { key: 'books', label: 'kitap', added: 2, updated: 0, total: 2 },
      { key: 'notes', label: 'not', added: 2, updated: 0, total: 2 },
    ])
  })

  it('keeps only the covers of books the backup has under the same id with the same address', () => {
    const coverUrls = new Map([
      ['y', COVER_A],
      ['x', COVER_A],
      ['gone', COVER_A],
    ])
    const plan = planRestore({ books: [book({ id: 'y', coverUrl: COVER_A }), book({ id: 'x', coverUrl: COVER_A }), book({ id: 'gone', coverUrl: COVER_A })], coverUrls }, incoming, 'replace')
    expect(plan.staleCovers).toEqual(['x', 'gone'])
  })
})
