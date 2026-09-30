import { describe, expect, it } from 'vitest'
import { book } from '../books/test-helpers.ts'
import { DATA_VERSION, migrateBook } from './migrations.ts'

describe('migrateBook', () => {
  it('passes a book of the current version through as it is', () => {
    const current = book()
    expect(migrateBook(current, DATA_VERSION)).toBe(current)
  })

  it('refuses a version it has no way forward from', () => {
    for (const from of [0, DATA_VERSION + 1, 1.5, Number.NaN]) expect(() => migrateBook(book(), from)).toThrow('No migration')
  })

  // No real step exists yet; these stand in for the ones later versions will add.
  it('runs every step between the stored version and the current one, in order', () => {
    const steps = {
      1: (old: Record<string, unknown>) => ({ ...old, tags: [] }),
      2: ({ tags, ...rest }: Record<string, unknown>) => ({ ...rest, shelves: tags }),
    }
    expect(migrateBook({ id: 'x' }, 1, steps, 3)).toEqual({ id: 'x', shelves: [] })
    expect(migrateBook({ id: 'x', tags: ['a'] }, 2, steps, 3)).toEqual({ id: 'x', shelves: ['a'] })
    expect(() => migrateBook({ id: 'x' }, 1, { 2: steps[2] }, 3)).toThrow('No migration from data version 1')
  })
})
