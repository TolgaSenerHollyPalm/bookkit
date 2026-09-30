import { describe, expect, it } from 'vitest'
import { book, note } from './test-helpers.ts'
import { authorLine, cardInfo, noteMeta } from './texts.ts'

const TODAY = '2026-10-05'
const written = new Date(2026, 8, 26, 21).toISOString()

describe('card and note lines', () => {
  it('say when, and how many notes, leaving the count out at zero', () => {
    const reading = book({ status: 'reading', startedAt: '2026-09-12', notes: [note('n1', written), note('q1', written, { kind: 'quote' }), note('n2', written)] })
    expect(cardInfo(reading, TODAY)).toBe('12 Eylül’de başladın · 3 not')
    expect(cardInfo(book({ notes: [note('n1', written)] }), TODAY)).toBe('Eklendi: 1 Eylül · 1 not')
    expect(cardInfo(book({ status: 'read' }), TODAY)).toBe('Bitirme tarihi yok')
  })

  it('put the page before the day of a note', () => {
    expect(noteMeta(note('n1', written, { page: 612 }), TODAY)).toBe('s. 612 · 26 Eylül')
    expect(noteMeta(note('n1', written), TODAY)).toBe('26 Eylül')
    expect(noteMeta(note('n1', written), '2027-01-02')).toBe('26 Eylül 2026')
  })

  it('list the authors with commas', () => {
    expect(authorLine({ authors: ['Ahmet Hamdi Tanpınar', 'Bir Çevirmen'] })).toBe('Ahmet Hamdi Tanpınar, Bir Çevirmen')
    expect(authorLine({ authors: [] })).toBe('')
  })
})
