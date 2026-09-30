import { describe, expect, it } from 'vitest'
import { cardDate, dateRange, dayMonth, dayOf, fullDate, pageDate, toDay } from './dates.ts'
import { book } from './test-helpers.ts'

const TODAY = '2026-10-05'

describe('local days', () => {
  it('take the day from the phone’s own calendar, not from UTC', () => {
    // Half past midnight and a quarter to midnight, local time: the UTC date differs in most time zones.
    expect(dayOf(new Date(2026, 8, 12, 0, 30).toISOString())).toBe('2026-09-12')
    expect(dayOf(new Date(2026, 8, 12, 23, 45).toISOString())).toBe('2026-09-12')
    expect(toDay(new Date(2026, 0, 3, 12))).toBe('2026-01-03')
  })

  it('are written the Turkish way', () => {
    expect(dayMonth('2026-09-12')).toBe('12 Eylül')
    expect(fullDate('2026-10-03')).toBe('3 Ekim 2026')
  })

  it('make a range that says each year and month once', () => {
    expect(dateRange('2026-09-12', '2026-10-03')).toBe('12 Eylül – 3 Ekim 2026')
    expect(dateRange('2025-12-20', '2026-01-03')).toBe('20 Aralık 2025 – 3 Ocak 2026')
    expect(dateRange('2026-10-03', '2026-10-12')).toBe('3 – 12 Ekim 2026')
    expect(dateRange('2026-10-03', '2026-10-03')).toBe('3 Ekim 2026')
  })
})

describe('the date on a library card', () => {
  it('gives every month its own ending', () => {
    const months = ['Ocak’ta', 'Şubat’ta', 'Mart’ta', 'Nisan’da', 'Mayıs’ta', 'Haziran’da', 'Temmuz’da', 'Ağustos’ta', 'Eylül’de', 'Ekim’de', 'Kasım’da', 'Aralık’ta']
    months.forEach((month, index) => {
      const startedAt = `2026-${String(index + 1).padStart(2, '0')}-12`
      expect(cardDate(book({ status: 'reading', startedAt }), '2026-12-31')).toBe(`12 ${month} başladın`)
    })
  })

  it('says what happened on that day', () => {
    expect(cardDate(book({ status: 'reading', startedAt: '2026-09-12' }), TODAY)).toBe('12 Eylül’de başladın')
    expect(cardDate(book({ status: 'read', finishedAt: '2026-10-03' }), TODAY)).toBe('3 Ekim’de bitirdin')
    expect(cardDate(book({ status: 'abandoned', finishedAt: '2026-10-03' }), TODAY)).toBe('3 Ekim’de bıraktın')
    expect(cardDate(book({ status: 'want' }), TODAY)).toBe('Eklendi: 1 Eylül')
    expect(cardDate(book({ status: 'read' }), TODAY)).toBe('Bitirme tarihi yok')
    expect(cardDate(book({ status: 'reading' }), TODAY)).toBeUndefined()
  })

  it('puts no ending on a date from another year', () => {
    expect(cardDate(book({ status: 'reading', startedAt: '2025-09-12' }), TODAY)).toBe('Başladın: 12 Eylül 2025')
    expect(cardDate(book({ status: 'read', finishedAt: '2025-10-03' }), TODAY)).toBe('Bitirdin: 3 Ekim 2025')
    expect(cardDate(book({ status: 'abandoned', finishedAt: '2025-10-03' }), TODAY)).toBe('Bıraktın: 3 Ekim 2025')
    expect(cardDate(book({ status: 'want' }), '2027-01-02')).toBe('Eklendi: 1 Eylül 2026')
  })
})

describe('the date line on a book’s page', () => {
  it('always carries the year and never an ending', () => {
    expect(pageDate(book({ status: 'reading', startedAt: '2026-09-12' }))).toBe('Başladın: 12 Eylül 2026')
    expect(pageDate(book({ status: 'read', startedAt: '2026-09-12', finishedAt: '2026-10-03' }))).toBe('12 Eylül – 3 Ekim 2026')
    expect(pageDate(book({ status: 'read', startedAt: '2025-12-20', finishedAt: '2026-01-03' }))).toBe('20 Aralık 2025 – 3 Ocak 2026')
    expect(pageDate(book({ status: 'read', finishedAt: '2026-10-03' }))).toBe('Bitirdin: 3 Ekim 2026')
    expect(pageDate(book({ status: 'abandoned', startedAt: '2026-09-12', finishedAt: '2026-10-03' }))).toBe('Bıraktın: 3 Ekim 2026')
    expect(pageDate(book({ status: 'want' }))).toBe('Eklendi: 1 Eylül 2026')
  })

  it('is left out when a finished book has no dates at all', () => {
    expect(pageDate(book({ status: 'read' }))).toBeUndefined()
    expect(pageDate(book({ status: 'reading' }))).toBeUndefined()
  })
})
