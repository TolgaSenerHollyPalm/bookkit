import type { Book, Day } from './types.ts'

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
// The ending each month takes in "12 Eylül’de"; a table, since no short rule gets all twelve right.
const IN_MONTH = ['’ta', '’ta', '’ta', '’da', '’ta', '’da', '’da', '’ta', '’de', '’de', '’da', '’ta']

const pad = (n: number) => String(n).padStart(2, '0')
const split = (day: Day) => day.split('-').map(Number) as [year: number, month: number, date: number]

/** The local calendar day of a moment. */
export const toDay = (date: Date): Day => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const today = (now = new Date()): Day => toDay(now)

/** The local day an ISO timestamp falls on; its first ten characters would be the day in UTC. */
export const dayOf = (iso: string): Day => toDay(new Date(iso))

export const yearOf = (day: Day): number => split(day)[0]

/** "12 Eylül" */
export function dayMonth(day: Day): string {
  const [, month, date] = split(day)
  return `${date} ${MONTHS[month - 1]}`
}

/** "12 Eylül 2026" */
export const fullDate = (day: Day): string => `${dayMonth(day)} ${yearOf(day)}`

/** "12 Eylül – 3 Ekim 2026", "3 – 12 Ekim 2026", "20 Aralık 2025 – 3 Ocak 2026", or one date when both are the same day. */
export function dateRange(from: Day, to: Day): string {
  if (from === to) return fullDate(to)
  if (yearOf(from) !== yearOf(to)) return `${fullDate(from)} – ${fullDate(to)}`
  return split(from)[1] === split(to)[1] ? `${split(from)[2]} – ${fullDate(to)}` : `${dayMonth(from)} – ${fullDate(to)}`
}

// An ending on a year follows how the number is read aloud, so another year gets "Başladın: 12 Eylül 2025" instead.
function said(day: Day, today: Day, verb: string, label: string): string {
  if (yearOf(day) !== yearOf(today)) return `${label}: ${fullDate(day)}`
  return `${dayMonth(day)}${IN_MONTH[split(day)[1] - 1]} ${verb}`
}

/** The date on a book's card in the library: "12 Eylül’de başladın", "Eklendi: 12 Eylül", "Bitirme tarihi yok". */
export function cardDate(book: Book, today: Day): string | undefined {
  switch (book.status) {
    case 'reading':
      return book.startedAt && said(book.startedAt, today, 'başladın', 'Başladın')
    case 'read':
      return book.finishedAt ? said(book.finishedAt, today, 'bitirdin', 'Bitirdin') : 'Bitirme tarihi yok'
    case 'abandoned':
      return book.finishedAt && said(book.finishedAt, today, 'bıraktın', 'Bıraktın')
    case 'want': {
      const added = dayOf(book.createdAt)
      return `Eklendi: ${yearOf(added) === yearOf(today) ? dayMonth(added) : fullDate(added)}`
    }
  }
}

/** The date line on a book's own page, always with the year and without an ending: "12 Eylül – 3 Ekim 2026". */
export function pageDate(book: Book): string | undefined {
  const started = book.startedAt && `Başladın: ${fullDate(book.startedAt)}`
  switch (book.status) {
    case 'reading':
      return started
    case 'read':
      if (book.startedAt && book.finishedAt && book.startedAt <= book.finishedAt) return dateRange(book.startedAt, book.finishedAt)
      return book.finishedAt ? `Bitirdin: ${fullDate(book.finishedAt)}` : started
    case 'abandoned':
      return book.finishedAt ? `Bıraktın: ${fullDate(book.finishedAt)}` : started
    case 'want':
      return `Eklendi: ${fullDate(dayOf(book.createdAt))}`
  }
}
