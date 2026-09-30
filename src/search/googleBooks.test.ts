import { afterEach, describe, expect, it, vi } from 'vitest'
import bekleBeni from './fixtures/google-bekle-beni.json'
import hamnet from './fixtures/google-isbn-hamnet.json'
import unknownIsbn from './fixtures/google-isbn-unknown.json'
import { GOOGLE_TIMEOUT_MS, googleAddress, googleKey, googlePage, GoogleRefusal, readGoogleAnswer, searchGoogle, tidyGoogleBook, type Fetcher } from './googleBooks.ts'

// The fixtures are Google Books' own answers to the app's request, of 30 September 2026, cut to their first records.
const KEY = 'test-key'
const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const never = new AbortController().signal

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('googleKey', () => {
  it('is the key the build was given', () => {
    vi.stubEnv('VITE_GOOGLE_BOOKS_KEY', KEY)
    expect(googleKey()).toBe(KEY)
  })

  it('is missing when the build was given none, or an empty one, as GitHub Actions passes an unset variable', () => {
    vi.stubEnv('VITE_GOOGLE_BOOKS_KEY', '')
    expect(googleKey()).toBeUndefined()
  })
})

describe('googleAddress', () => {
  it('asks for the words as typed, with the key, for twenty books and only the fields the app reads', () => {
    const address = new URL(googleAddress('  bekle beni ', KEY))
    expect(address.origin + address.pathname).toBe('https://www.googleapis.com/books/v1/volumes')
    expect(address.searchParams.get('q')).toBe('bekle beni')
    expect(address.searchParams.get('key')).toBe(KEY)
    expect(address.searchParams.get('maxResults')).toBe('20')
    expect(address.searchParams.get('printType')).toBe('books')
    expect(address.searchParams.get('fields')).toContain('imageLinks/thumbnail')
  })

  it('looks an ISBN up as an ISBN', () => {
    expect(new URL(googleAddress('978-605-198-230-4', KEY)).searchParams.get('q')).toBe('isbn:9786051982304')
    expect(new URL(googleAddress('6051982302', KEY)).searchParams.get('q')).toBe('isbn:9786051982304')
  })
})

describe('readGoogleAnswer', () => {
  const books = readGoogleAnswer(bekleBeni)

  it('keeps Google’s order and its own spelling: its terms forbid changing either', () => {
    expect(books.map((book) => book.id)).toEqual(bekleBeni.items.map((item) => item.id))
    expect(books.slice(0, 3).map((book) => `${book.title} — ${book.authors.join(', ')}`)).toEqual(['BEKLE BENİ — CEM ALCAN', 'BEKLE BENİ GELECEĞİM — MECİT ÖZDEMİR', 'Bekle beni — Zülfü Livaneli'])
  })

  it('links every book to its page on Google Books', () => {
    expect(books.every((book) => book.link === googlePage(book.id))).toBe(true)
    expect(books[2].link).toBe('https://books.google.com/books?id=WrPo0QEACAAJ')
  })

  it('reads the ISBN-13, and the cover’s address as https', () => {
    expect(books[2]).toMatchObject({ isbn: '9789750766091', language: 'tr' })
    expect(bekleBeni.items[0].volumeInfo.imageLinks?.thumbnail).toMatch(/^http:/)
    expect(books[0].coverUrl).toMatch(/^https:\/\/books\.google\.com\/books\/content\?id=7wvFEQAAQBAJ/)
  })

  it('leaves out what a record does not have', () => {
    expect(books[0].isbn).toBeUndefined()
    expect('coverUrl' in books[2]).toBe(false)
    expect(books.find((book) => book.title === 'Papirüs')?.authors).toEqual([])
  })

  it('finds nothing in an answer without books', () => {
    expect(unknownIsbn).toEqual({})
    expect(readGoogleAnswer(unknownIsbn)).toEqual([])
  })

  it('refuses what is not an answer, and skips a record it cannot make sense of', () => {
    expect(() => readGoogleAnswer(null)).toThrow()
    expect(() => readGoogleAnswer({ items: 'none' })).toThrow()
    expect(readGoogleAnswer({ items: [null, { id: 'x' }, { volumeInfo: { title: 'No id' } }, { id: 'ok', volumeInfo: { title: 'Huzur', authors: 'not a list', industryIdentifiers: [{ type: 'OTHER', identifier: 'UOM:39015' }] } }] })).toEqual([
      { id: 'ok', title: 'Huzur', authors: [], link: googlePage('ok') },
    ])
  })
})

describe('tidyGoogleBook', () => {
  const [caps, , livaneli] = readGoogleAnswer(bekleBeni)

  it('spells a book the reader adds as the library’s other books are spelled', () => {
    expect(tidyGoogleBook(caps, 'bekle beni')).toEqual({ title: 'Bekle Beni', authors: ['Cem Alcan'] })
    expect(tidyGoogleBook(livaneli, 'bekle beni')).toEqual({ title: 'Bekle Beni', authors: ['Zülfü Livaneli'] })
  })

  it('mends the broken escape Google has in a name', () => {
    const [book] = readGoogleAnswer(hamnet)
    expect(book.authors).toEqual(['Maggie O&039;Farrell'])
    expect(tidyGoogleBook(book, '9786051982304')).toEqual({ title: 'Hamnet', authors: ["Maggie O'Farrell"] })
  })

  it('takes the Turkish letters of what was typed, but nothing from an ISBN', () => {
    const book = { id: 'x', title: 'Gece Yarisi Kütüphanesi', authors: ['Sermin Yasar'], language: 'tr', link: googlePage('x') }
    expect(tidyGoogleBook(book, 'gece yarısı kütüphanesi şermin yaşar')).toEqual({ title: 'Gece Yarısı Kütüphanesi', authors: ['Şermin Yaşar'] })
    expect(tidyGoogleBook(book, '9786051981833')).toEqual({ title: 'Gece Yarisi Kütüphanesi', authors: ['Sermin Yasar'] })
  })

  it('leaves another language’s title in its own case', () => {
    expect(tidyGoogleBook({ id: 'x', title: 'The midnight library', authors: ['Matt Haig'], language: 'en', link: googlePage('x') }, 'midnight').title).toBe('The midnight library')
  })
})

describe('searchGoogle', () => {
  it('asks Google with the key and gives back its books', async () => {
    const asked: string[] = []
    const books = await searchGoogle('bekle beni', KEY, never, async (url) => {
      asked.push(url)
      return answer(bekleBeni)
    })
    expect(asked).toEqual([googleAddress('bekle beni', KEY)])
    expect(books).toHaveLength(bekleBeni.items.length)
  })

  it('tells a refusal by its status: 429 is the day’s quota used up', async () => {
    const refusal = await searchGoogle('bekle beni', KEY, never, async () => answer({ error: { code: 429 } }, 429)).catch((error: unknown) => error)
    expect(refusal).toBeInstanceOf(GoogleRefusal)
    expect((refusal as GoogleRefusal).status).toBe(429)
    await expect(searchGoogle('bekle beni', KEY, never, async () => answer({ error: { code: 403 } }, 403))).rejects.toMatchObject({ status: 403 })
  })

  it('fails when the connection does, and gives up after eight seconds', async () => {
    await expect(searchGoogle('bekle beni', KEY, never, () => Promise.reject(new TypeError('Failed to fetch')))).rejects.toThrow('Failed to fetch')
    vi.useFakeTimers()
    const hanging: Fetcher = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
    const failed = expect(searchGoogle('bekle beni', KEY, never, hanging)).rejects.toThrow('Aborted')
    await vi.advanceTimersByTimeAsync(GOOGLE_TIMEOUT_MS)
    await failed
  })

  it('stops when it is cancelled', async () => {
    const controller = new AbortController()
    let signal: AbortSignal | undefined
    const search = searchGoogle('bekle beni', KEY, controller.signal, (_url, init) => {
      signal = init.signal
      return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
    })
    controller.abort()
    await expect(search).rejects.toThrow('Aborted')
    expect(signal?.aborted).toBe(true)
  })
})
