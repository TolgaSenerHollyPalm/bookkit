import { describe, expect, it } from 'vitest'
import { book } from '../books/test-helpers.ts'
import { inLibrary } from './library.ts'
import type { FoundBook } from './results.ts'

const found = (fields: Partial<FoundBook> = {}): FoundBook => ({ id: 'W1', title: 'Huzur', authors: ['Ahmet Hamdi Tanpınar'], isbns: [], turkish: true, ...fields })

describe('inLibrary', () => {
  it('knows a book by its title and first author, however they are spelled', () => {
    const books = [book({ id: 'a', title: 'HUZUR', authors: ['Ahmet Hamdi Tanpinar'] })]
    expect(inLibrary(books, found())?.id).toBe('a')
    expect(inLibrary(books, found({ title: 'Beş Şehir' }))).toBeUndefined()
    expect(inLibrary(books, found({ authors: ['Başka Biri'] }))).toBeUndefined()
  })

  it('knows a book by any ISBN of the records folded into the row, whatever it is called there', () => {
    const books = [book({ id: 'a', title: 'A Mind at Peace', authors: [], isbn: '9789750801754' })]
    expect(inLibrary(books, found({ isbn: '9789759955762', isbns: ['9789759955762', '9789750801754'] }))?.id).toBe('a')
    expect(inLibrary(books, found({ isbn: '9789759955762', isbns: ['9789759955762'] }))).toBeUndefined()
  })

  it('finds nothing in an empty library', () => {
    expect(inLibrary([], found())).toBeUndefined()
  })
})
