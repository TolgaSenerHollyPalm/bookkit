import type { BackupAdapter, CountLine } from 'kitshelf-ui/backup/format.ts'
import { backupDue } from 'kitshelf-ui/backup/reminder.ts'
import { readBackupState, snoozeReminder, type BackupState } from 'kitshelf-ui/backup/state.ts'
import { useCallback, useMemo, useState } from 'react'
import { useAppData } from '../app/appData.ts'
import type { Book, BookNote } from '../books/types.ts'
import { KIT, KIT_NAME } from '../kit.ts'
import { restoreBackup } from '../storage/db.ts'
import { DATA_VERSION, migrateBook } from '../storage/migrations.ts'
import type { KitData } from './restorePlan.ts'

/** The kit's own words in the shared backup parts. */
export const BACKUP_TEXTS = {
  card: 'Kitapların ve notların yalnızca bu cihazda duruyor. Yedek dosyasını Drive’a, e-postana ya da kendine gönder; telefon değişirse buradan geri yüklersin.',
  merge: 'Bu cihazda olmayan kitaplar eklenir. İkisinde de olan kitabın daha yeni hâli kalır. Hiçbir şey silinmez.',
  replace: 'Bu cihazdaki kitaplar ve notlar silinir, yerine yedektekiler gelir.',
  banner: 'Telefonun değişirse notların kaybolmasın.',
}

/** Notes and quotes together, as the library's cards count them. */
export const noteCount = (books: readonly Book[]): number => books.reduce((sum, book) => sum + book.notes.length, 0)

export function replaceWarning(localBooks: readonly Book[], backupBooks: number) {
  return {
    title: 'Bu cihazdaki kitaplar silinsin mi?',
    text: `Bu cihazdaki ${localBooks.length} kitap ve ${noteCount(localBooks)} not silinecek, yerine yedekteki ${backupBooks} kitap gelecek. Geri alınamaz.`,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string'
const isId = (value: unknown): boolean => isText(value) && value !== ''
const isMoment = (value: unknown): boolean => isText(value) && !Number.isNaN(Date.parse(value))
const isDay = (value: unknown): boolean => isText(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
const isWhole = (value: unknown, from: number, to: number): boolean => Number.isInteger(value) && (value as number) >= from && (value as number) <= to
const maybe = (value: unknown, check: (value: unknown) => boolean): boolean => value === undefined || check(value)
const distinct = (ids: unknown[]): boolean => new Set(ids).size === ids.length

const STATUSES = ['want', 'reading', 'read', 'abandoned']
const SOURCES = ['openlibrary', 'googlebooks', 'manual']

const isNote = (value: unknown): value is BookNote =>
  isRecord(value) && isId(value.id) && (value.kind === 'note' || value.kind === 'quote') && isText(value.text) && isMoment(value.createdAt) && maybe(value.page, (page) => isWhole(page, 1, 9999))

// The shape a stored book has had since version 1; a date the screens could not print is a broken record too.
const isBook = (value: unknown): value is Book =>
  isRecord(value) &&
  isId(value.id) &&
  isText(value.title) &&
  value.title.trim() !== '' &&
  Array.isArray(value.authors) &&
  value.authors.every(isText) &&
  STATUSES.includes(value.status as string) &&
  Array.isArray(value.notes) &&
  value.notes.every(isNote) &&
  distinct(value.notes.map((note) => note.id)) &&
  isMoment(value.createdAt) &&
  isMoment(value.updatedAt) &&
  maybe(value.isbn, isText) &&
  maybe(value.startedAt, isDay) &&
  maybe(value.finishedAt, isDay) &&
  maybe(value.rating, (rating) => isWhole(rating, 1, 5)) &&
  maybe(value.coverUrl, isText) &&
  maybe(value.source, (source) => isRecord(source) && SOURCES.includes(source.kind as string) && maybe(source.id, isText))

/** Structure only: one bad book or note, or an id used twice, and the whole file is refused. */
export function validateKitData(data: unknown): data is KitData {
  if (!isRecord(data) || !Array.isArray(data.books) || !data.books.every(isBook)) return false
  return distinct(data.books.map((book) => book.id))
}

export function summarizeKit(data: KitData): CountLine[] {
  const notes = data.books.flatMap((book) => book.notes)
  return [
    { key: 'books', count: data.books.length, label: 'kitap' },
    { key: 'notes', count: notes.filter((note) => note.kind === 'note').length, label: 'not' },
    { key: 'quotes', count: notes.filter((note) => note.kind === 'quote').length, label: 'alıntı' },
  ]
}

/** An older backup takes the steps an older device's books take (storage/migrations.ts); an unknown version throws. */
export function migrateKit(data: unknown, from: number): unknown {
  if (from === DATA_VERSION) return data
  // Asked here too: a backup with no books in it would otherwise pass whatever its version.
  if (!Number.isInteger(from) || from < 1 || from > DATA_VERSION) throw new Error(`No backup migration from data version ${from}`)
  if (!isRecord(data) || !Array.isArray(data.books)) throw new Error('A backup without books')
  return { ...data, books: data.books.map((book) => migrateBook(book, from)) }
}

/** When the reader last changed anything: the newest stamp of any book. */
export const latestChange = (books: readonly Book[]): string | undefined => books.reduce<string | undefined>((latest, book) => (latest === undefined || book.updatedAt > latest ? book.updatedAt : latest), undefined)

/** The adapter reads what is in memory, so the share sheet can open right after the tap. */
export function useKitBackup(): BackupAdapter<KitData> {
  const { books, reload } = useAppData()
  return useMemo(
    () => ({
      kit: KIT,
      kitName: KIT_NAME,
      dataVersion: DATA_VERSION,
      appBuild: __BUILD_TIME__,
      exportData: () => ({ books }),
      summarize: summarizeKit,
      migrate: migrateKit,
      validate: validateKitData,
      async restore(data, mode) {
        const counts = await restoreBackup(data, mode)
        await reload()
        return counts
      },
      lastChangeAt: () => latestChange(books),
      hasUserData: () => books.length > 0,
    }),
    [books, reload],
  )
}

function reminderOf(state: BackupState, books: readonly Book[]) {
  return backupDue({ now: new Date(), hasUserData: books.length > 0, lastChangeAt: latestChange(books), ...state })
}

/** Whether a backup is due, for the home screen's banner and dot and for the settings card. */
export function useBackupReminder() {
  const { books } = useAppData()
  const [state, setState] = useState(() => readBackupState(KIT))
  const refresh = useCallback(() => setState(readBackupState(KIT)), [])
  const snooze = useCallback(() => {
    snoozeReminder(KIT, new Date())
    setState(readBackupState(KIT))
  }, [])
  return { reminder: reminderOf(state, books), lastBackupAt: state.lastBackupAt, refresh, snooze }
}
