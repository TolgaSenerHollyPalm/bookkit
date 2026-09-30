import { describe, expect, it } from 'vitest'
import { booksOfTab, finishedThisYear, initialTab, latestNote, sortedNotes, tabCounts, withBook } from './library.ts'
import { book, note } from './test-helpers.ts'

const at = (day: number) => new Date(2026, 8, day, 9).toISOString()

describe('tabs', () => {
  const books = [
    book({ id: 'r1', status: 'reading' }),
    book({ id: 'w1' }),
    book({ id: 'w2' }),
    book({ id: 'd1', status: 'read' }),
    book({ id: 'a1', status: 'abandoned' }),
  ]

  it('count the books given up with the finished ones', () => {
    expect(tabCounts(books)).toEqual({ reading: 1, want: 2, read: 2 })
  })

  it('open on the first one that has a book', () => {
    expect(initialTab(books)).toBe('reading')
    expect(initialTab(books.filter((b) => b.status !== 'reading'))).toBe('want')
    expect(initialTab([book({ status: 'abandoned' })])).toBe('read')
    expect(initialTab([])).toBe('reading')
  })
})

describe('withBook', () => {
  it('replaces a book in place and adds a new one at the end', () => {
    const books = [book({ id: 'a' }), book({ id: 'b' })]
    const changed = book({ id: 'a', title: 'Beş Şehir' })
    expect(withBook(books, changed)).toEqual([changed, books[1]])
    expect(withBook(books, book({ id: 'c' })).map((b) => b.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('the order of a tab', () => {
  const ids = (list: { id: string }[]) => list.map((b) => b.id)

  it('Okuyorum: newest start first, then the book added later, then the ones with no starting day', () => {
    const books = [
      book({ id: 'old', status: 'reading', startedAt: '2026-09-02', createdAt: at(2) }),
      book({ id: 'none', status: 'reading', createdAt: at(20) }),
      book({ id: 'tie-early', status: 'reading', startedAt: '2026-09-12', createdAt: at(10) }),
      book({ id: 'tie-late', status: 'reading', startedAt: '2026-09-12', createdAt: at(11) }),
    ]
    expect(ids(booksOfTab(books, 'reading'))).toEqual(['tie-late', 'tie-early', 'old', 'none'])
  })

  it('Okumak istiyorum: the book added last first', () => {
    const books = [book({ id: 'first', createdAt: at(1) }), book({ id: 'third', createdAt: at(3) }), book({ id: 'second', createdAt: at(2) })]
    expect(ids(booksOfTab(books, 'want'))).toEqual(['third', 'second', 'first'])
  })

  it('Okudum: newest finishing day first, given up or not, and the undated at the end', () => {
    const books = [
      book({ id: 'years-ago', status: 'read', createdAt: at(30) }),
      book({ id: 'june', status: 'read', finishedAt: '2026-06-01' }),
      book({ id: 'given-up', status: 'abandoned', finishedAt: '2026-08-15' }),
      book({ id: 'october', status: 'read', finishedAt: '2026-10-03' }),
      book({ id: 'reading', status: 'reading', startedAt: '2026-10-04' }),
    ]
    expect(ids(booksOfTab(books, 'read'))).toEqual(['october', 'given-up', 'june', 'years-ago'])
  })
})

describe('Bu yıl n kitap', () => {
  it('counts the books finished in the year of today, not the ones given up or undated', () => {
    const books = [
      book({ status: 'read', finishedAt: '2026-01-01' }),
      book({ status: 'read', finishedAt: '2026-12-31' }),
      book({ status: 'read', finishedAt: '2025-12-31' }),
      book({ status: 'read' }),
      book({ status: 'abandoned', finishedAt: '2026-05-05' }),
      book({ status: 'reading', startedAt: '2026-05-05' }),
    ]
    expect(finishedThisYear(books, '2026-10-05')).toBe(2)
    expect(finishedThisYear(books, '2025-12-31')).toBe(1)
    expect(finishedThisYear(books, '2027-01-01')).toBe(0)
  })
})

describe('notes', () => {
  const huzur = book({ id: 'huzur', notes: [note('n1', at(12)), note('n3', at(26)), note('n2', at(19))] })
  const anna = book({ id: 'anna', notes: [note('q1', at(27), { kind: 'quote' })] })

  it('are listed newest first', () => {
    expect(sortedNotes(huzur).map((n) => n.id)).toEqual(['n3', 'n2', 'n1'])
  })

  it('Son notun is the newest of the whole library', () => {
    expect(latestNote([huzur, anna])).toEqual({ book: anna, note: anna.notes[0] })
    expect(latestNote([huzur])?.note.id).toBe('n3')
    expect(latestNote([book()])).toBeUndefined()
  })
})
