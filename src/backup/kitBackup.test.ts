import { backupFileName, createBackup, readBackup, type BackupAdapter } from 'kitshelf-ui/backup/format.ts'
import { restoreMessage } from 'kitshelf-ui/backup/texts.ts'
import { describe, expect, it } from 'vitest'
import { book, note } from '../books/test-helpers.ts'
import type { Book } from '../books/types.ts'
import { KIT, KIT_NAME } from '../kit.ts'
import { DATA_VERSION } from '../storage/migrations.ts'
import { BACKUP_TEXTS, latestChange, migrateKit, noteCount, replaceWarning, summarizeKit, validateKitData } from './kitBackup.ts'
import { planRestore, type KitData } from './restorePlan.ts'

const at = (day: number) => `2026-09-${String(day).padStart(2, '0')}T10:00:00.000Z`
const full = book({
  id: 'anna',
  title: 'Anna Karenina',
  authors: ['Lev Tolstoy'],
  isbn: '9789759099541',
  status: 'read',
  startedAt: '2026-08-01',
  finishedAt: '2026-09-03',
  rating: 5,
  coverUrl: 'https://covers.openlibrary.org/b/id/9895000-M.jpg?default=false',
  source: { kind: 'openlibrary', id: 'OL267096W' },
  notes: [note('n1', at(2), { page: 271 }), note('q1', at(3), { kind: 'quote', text: 'Mutlu ailelerin hepsi birbirine benzer.' })],
})

describe('validateKitData', () => {
  it('accepts books as the app stores them, bare or with everything a book can have', () => {
    expect(validateKitData({ books: [book(), full, book({ id: 'g', source: { kind: 'googlebooks', id: 'WrPo0QEACAAJ' } }), book({ id: 'm', source: { kind: 'manual' }, authors: [] })] })).toBe(true)
    expect(validateKitData({ books: [] })).toBe(true)
  })

  const broken = (change: (copy: Record<string, unknown>) => void) => {
    const copy = structuredClone(full) as unknown as Record<string, unknown>
    change(copy)
    return { books: [copy] }
  }

  it('refuses the whole file for one missing field or one wrong type', () => {
    const cases = [
      broken((b) => delete b.title),
      broken((b) => (b.title = '  ')),
      broken((b) => (b.id = '')),
      broken((b) => (b.authors = 'Lev Tolstoy')),
      broken((b) => (b.authors = [7])),
      broken((b) => (b.status = 'lent')),
      broken((b) => delete b.notes),
      broken((b) => delete b.updatedAt),
      broken((b) => (b.createdAt = 'yesterday')),
      broken((b) => (b.isbn = 9789759099541)),
      broken((b) => (b.rating = 6)),
      broken((b) => (b.rating = 4.5)),
      broken((b) => (b.coverUrl = 12)),
      broken((b) => (b.source = { kind: 'goodreads' })),
      broken((b) => (b.source = 'openlibrary')),
    ]
    for (const data of cases) expect(validateKitData(data), JSON.stringify(data.books[0])).toBe(false)
  })

  it('refuses a date the screens could not print', () => {
    for (const day of ['3 Eylül', '2026-9-3', '2026-13-40', '']) {
      expect(validateKitData(broken((b) => (b.finishedAt = day)))).toBe(false)
      expect(validateKitData(broken((b) => (b.startedAt = day)))).toBe(false)
    }
  })

  it('refuses a broken note, or a note id used twice in one book', () => {
    const withNotes = (notes: unknown[]) => broken((b) => (b.notes = notes))
    expect(validateKitData(withNotes([{ id: 'n', kind: 'memo', text: 'x', createdAt: at(1) }]))).toBe(false)
    expect(validateKitData(withNotes([{ id: 'n', kind: 'note', createdAt: at(1) }]))).toBe(false)
    expect(validateKitData(withNotes([{ id: 'n', kind: 'note', text: 'x', createdAt: at(1), page: 0 }]))).toBe(false)
    expect(validateKitData(withNotes([{ id: 'n', kind: 'note', text: 'x', createdAt: at(1), page: 12000 }]))).toBe(false)
    expect(validateKitData(withNotes([note('n', at(1)), note('n', at(2))]))).toBe(false)
  })

  it('refuses a book id used twice, and anything that is not a list of books', () => {
    for (const data of [{ books: [book(), book()] }, { books: 'none' }, { notes: [] }, {}, null, []]) expect(validateKitData(data)).toBe(false)
  })

  it('lets the same note id appear in two different books', () => {
    expect(validateKitData({ books: [book({ id: 'a', notes: [note('n', at(1))] }), book({ id: 'b', notes: [note('n', at(1))] })] })).toBe(true)
  })
})

describe('summarizeKit', () => {
  it('counts the books, the notes and the quotes', () => {
    expect(summarizeKit({ books: [full, book({ id: 'b', notes: [note('n2', at(4))] }), book({ id: 'c' })] })).toEqual([
      { key: 'books', count: 3, label: 'kitap' },
      { key: 'notes', count: 2, label: 'not' },
      { key: 'quotes', count: 1, label: 'alıntı' },
    ])
  })
})

describe('migrateKit', () => {
  it('passes the current version through and refuses one it does not know', () => {
    const data = { books: [] }
    expect(migrateKit(data, DATA_VERSION)).toBe(data)
    expect(() => migrateKit(data, DATA_VERSION + 1)).toThrow()
    expect(() => migrateKit(data, 0)).toThrow()
  })
})

describe('latestChange and noteCount', () => {
  it('finds the newest stamp of any book', () => {
    expect(latestChange([book({ id: 'a', updatedAt: at(5) }), book({ id: 'b', updatedAt: at(20) }), book({ id: 'c', updatedAt: at(9) })])).toBe(at(20))
    expect(latestChange([])).toBeUndefined()
  })

  it('counts notes and quotes together', () => {
    expect(noteCount([full, book({ id: 'b', notes: [note('n2', at(4))] })])).toBe(3)
  })
})

describe('the texts a restore shows', () => {
  it('warns with the numbers of what replacing would delete and bring', () => {
    expect(replaceWarning([full, book({ id: 'b' })], 12)).toEqual({
      title: 'Bu cihazdaki kitaplar silinsin mi?',
      text: 'Bu cihazdaki 2 kitap ve 2 not silinecek, yerine yedekteki 12 kitap gelecek. Geri alınamaz.',
    })
  })

  it('says what a merge did, leaving out what is zero', () => {
    const local = { books: [book({ id: 'a', updatedAt: at(1) })], coverUrls: new Map<string, string>() }
    const both = planRestore(local, { books: [book({ id: 'a', updatedAt: at(9) }), book({ id: 'b' })] }, 'merge')
    expect(restoreMessage(both.counts, 'merge')).toBe('Geri yüklendi: 1 kitap eklendi, 1 kitap güncellendi.')
    expect(restoreMessage(planRestore(local, { books: [book({ id: 'b' })] }, 'merge').counts, 'merge')).toBe('Geri yüklendi: 1 kitap eklendi.')
    expect(restoreMessage(planRestore(local, { books: local.books }, 'merge').counts, 'merge')).toBe('Yedekteki her şey bu cihazda zaten var.')
  })

  it('says what a replace brought: books and notes', () => {
    expect(restoreMessage(planRestore({ books: [], coverUrls: new Map() }, { books: [full, book({ id: 'b' })] }, 'replace').counts, 'replace')).toBe('Geri yüklendi: 2 kitap, 2 not.')
  })

  it('speaks of books and notes, not of another kit’s things', () => {
    for (const words of Object.values(BACKUP_TEXTS)) expect(words).not.toMatch(/seyahat|soru paketi/i)
  })
})

// The same pieces the settings screen hands to kitshelf-ui, without React around them.
const adapter = (books: Book[]): BackupAdapter<KitData> => ({
  kit: KIT,
  kitName: KIT_NAME,
  dataVersion: DATA_VERSION,
  appBuild: 'test',
  exportData: () => ({ books }),
  summarize: summarizeKit,
  migrate: migrateKit,
  validate: validateKitData,
  restore: async () => [],
  lastChangeAt: () => latestChange(books),
  hasUserData: () => books.length > 0,
})

describe('a backup file', () => {
  const books = [full, book({ id: 'b', title: 'Huzur' })]
  const now = new Date('2026-09-30T12:00:00.000Z')
  const backup = createBackup(adapter(books), now)

  it('is named after the kit and reads back as the same books, notes and cover addresses', async () => {
    const file = new File([JSON.stringify(backup)], backupFileName(KIT, now))
    expect(file.name).toBe('bookkit-yedek-2026-09-30.json')
    const read = await readBackup(file, adapter([]))
    expect(read.ok && read.backup.data).toEqual({ books })
    expect(read.ok && read.preview.counts).toEqual([
      { key: 'books', count: 2, label: 'kitap' },
      { key: 'notes', count: 1, label: 'not' },
      { key: 'quotes', count: 1, label: 'alıntı' },
    ])
  })

  it('carries the cover’s address but no picture', () => {
    const written = JSON.stringify(backup)
    expect(written).toContain('https://covers.openlibrary.org/b/id/9895000-M.jpg?default=false')
    expect(backup.summary).toEqual({ books: 2, notes: 1, quotes: 1 })
    expect(Object.keys(backup.data)).toEqual(['books'])
  })

  it('of another kit is turned away by name', async () => {
    const other = { ...backup, kit: 'tripkit', kitName: 'TripKit' }
    expect(await readBackup(new File([JSON.stringify(other)], 'tripkit-yedek.json'), adapter([]))).toEqual({ ok: false, error: 'other-kit', kitName: 'TripKit' })
  })

  it('with one broken book is refused whole, and one from a newer version asks for an update', async () => {
    const damaged = { ...backup, data: { books: [...books, { id: 'x', title: 'No status' }] } }
    expect(await readBackup(new File([JSON.stringify(damaged)], 'x.json'), adapter([]))).toEqual({ ok: false, error: 'damaged' })
    const newer = { ...backup, dataVersion: DATA_VERSION + 1 }
    expect(await readBackup(new File([JSON.stringify(newer)], 'x.json'), adapter([]))).toEqual({ ok: false, error: 'too-new' })
  })
})
