import { describe, expect, it } from 'vitest'
import { ACTIONS, applyAction, changeStatus, dateProblems, newBook, rateBook, stampBook, tidyBook } from './status.ts'
import { book } from './test-helpers.ts'

const TODAY = '2026-10-05'

describe('a book changes state', () => {
  it('Okumaya başla: from the wish list to reading, started today', () => {
    expect(applyAction(book(), 'start', TODAY)).toMatchObject({ status: 'reading', startedAt: TODAY })
  })

  it('Bitirdim: finished today, the starting day kept', () => {
    const reading = book({ status: 'reading', startedAt: '2026-09-12' })
    expect(applyAction(reading, 'finish', TODAY)).toMatchObject({ status: 'read', startedAt: '2026-09-12', finishedAt: TODAY })
  })

  it('Yarım bıraktım: given up today, and a rating does not survive it', () => {
    const given = applyAction(book({ status: 'reading', startedAt: '2026-09-12', rating: 4 }), 'abandon', TODAY)
    expect(given).toMatchObject({ status: 'abandoned', startedAt: '2026-09-12', finishedAt: TODAY })
    expect('rating' in given).toBe(false)
  })

  it('Tekrar başla: reading again from today, the finishing day and the rating gone', () => {
    for (const status of ['abandoned', 'read'] as const) {
      const again = applyAction(book({ status, startedAt: '2026-08-01', finishedAt: '2026-09-01', rating: 5 }), 'restart', TODAY)
      expect(again).toMatchObject({ status: 'reading', startedAt: TODAY })
      expect(Object.keys(again)).not.toEqual(expect.arrayContaining(['finishedAt', 'rating']))
    }
  })

  it('offers each state its own buttons', () => {
    expect(ACTIONS).toEqual({ want: ['start'], reading: ['finish', 'abandon'], read: [], abandoned: ['restart'] })
  })
})

describe('a state picked in the edit form', () => {
  const finished = book({ status: 'read', startedAt: '2026-08-01', finishedAt: '2026-09-01', rating: 5 })

  it('Okumak istiyorum clears both dates and the rating', () => {
    const wanted = changeStatus(finished, 'want', TODAY)
    expect(wanted.status).toBe('want')
    expect(Object.keys(wanted)).not.toEqual(expect.arrayContaining(['startedAt', 'finishedAt', 'rating']))
  })

  it('Okuyorum starts, or restarts, today', () => {
    expect(changeStatus(book(), 'reading', TODAY)).toMatchObject({ status: 'reading', startedAt: TODAY })
    expect(changeStatus(finished, 'reading', TODAY)).toEqual(applyAction(finished, 'restart', TODAY))
  })

  it('Okudum finishes a book being read today, and makes up no day for any other', () => {
    expect(changeStatus(book({ status: 'reading', startedAt: '2026-09-12' }), 'read', TODAY)).toMatchObject({ status: 'read', finishedAt: TODAY })
    expect('finishedAt' in changeStatus(book(), 'read', TODAY)).toBe(false)
  })

  it('Yarım bıraktım keeps the day of a finished book and drops its rating', () => {
    const given = changeStatus(finished, 'abandoned', TODAY)
    expect(given).toMatchObject({ status: 'abandoned', finishedAt: '2026-09-01' })
    expect('rating' in given).toBe(false)
  })

  it('leaves the book alone when the state is the one it has', () => {
    expect(changeStatus(finished, 'read', TODAY)).toBe(finished)
  })
})

describe('a new book', () => {
  const now = new Date(2026, 9, 5, 21, 30)
  const base = { id: 'n1', title: 'Huzur', authors: ['Ahmet Hamdi Tanpınar'] }

  it('added as Okuyorum starts today, by the local calendar', () => {
    expect(newBook({ ...base, status: 'reading' }, now)).toMatchObject({ status: 'reading', startedAt: TODAY, notes: [], createdAt: now.toISOString(), updatedAt: now.toISOString() })
  })

  it('added as Okudum has a finishing day only when one was given', () => {
    expect(newBook({ ...base, status: 'read', finishedAt: '2019-06-01' }, now).finishedAt).toBe('2019-06-01')
    expect('finishedAt' in newBook({ ...base, status: 'read' }, now)).toBe(false)
    expect('finishedAt' in newBook({ ...base, status: 'want', finishedAt: '2019-06-01' }, now)).toBe(false)
  })

  it('stores no key for what was left out', () => {
    const made = newBook({ ...base, status: 'want', isbn: undefined, coverUrl: undefined, source: undefined }, now)
    expect(Object.keys(made).sort()).toEqual(['authors', 'createdAt', 'id', 'notes', 'status', 'title', 'updatedAt'])
  })
})

describe('rating and stamping', () => {
  it('rates only a finished book, and the same star again takes the rating back', () => {
    const finished = book({ status: 'read' })
    expect(rateBook(finished, 4).rating).toBe(4)
    expect('rating' in rateBook(rateBook(finished, 4), 4)).toBe(false)
    expect(rateBook(rateBook(finished, 4), 2).rating).toBe(2)
    expect(rateBook(book({ status: 'reading' }), 4)).toEqual(book({ status: 'reading' }))
  })

  it('marks when the book was last changed', () => {
    expect(stampBook(book(), new Date('2026-10-05T18:00:00.000Z')).updatedAt).toBe('2026-10-05T18:00:00.000Z')
  })
})

describe('tidyBook', () => {
  const full = { startedAt: '2026-08-01', finishedAt: '2026-09-01', rating: 5 } as const

  it('keeps only what the state can have', () => {
    expect(Object.keys(tidyBook(book({ status: 'want', ...full })))).not.toEqual(expect.arrayContaining(['startedAt', 'finishedAt', 'rating']))
    expect(tidyBook(book({ status: 'reading', ...full }))).toMatchObject({ startedAt: '2026-08-01' })
    expect(Object.keys(tidyBook(book({ status: 'reading', ...full })))).not.toEqual(expect.arrayContaining(['finishedAt', 'rating']))
    expect(tidyBook(book({ status: 'read', ...full }))).toMatchObject(full)
    expect(tidyBook(book({ status: 'abandoned', ...full }))).toMatchObject({ startedAt: '2026-08-01', finishedAt: '2026-09-01' })
    expect('rating' in tidyBook(book({ status: 'abandoned', ...full }))).toBe(false)
  })
})

describe('dates in the edit form', () => {
  it('must be in order and not in the future', () => {
    expect(dateProblems({ startedAt: '2026-09-12', finishedAt: '2026-10-03' }, TODAY)).toEqual([])
    expect(dateProblems({ startedAt: '2026-09-12', finishedAt: '2026-09-12' }, TODAY)).toEqual([])
    expect(dateProblems({ startedAt: '2026-09-12', finishedAt: '2026-09-11' }, TODAY)).toEqual(['Bitirme tarihi başlama tarihinden önce olamaz.'])
    expect(dateProblems({ startedAt: '2026-10-06' }, TODAY)).toEqual(['İleri bir tarih seçilemez.'])
    expect(dateProblems({ finishedAt: '2027-01-01' }, TODAY)).toEqual(['İleri bir tarih seçilemez.'])
    expect(dateProblems({}, TODAY)).toEqual([])
  })
})
