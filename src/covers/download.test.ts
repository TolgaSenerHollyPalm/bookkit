import { afterEach, describe, expect, it, vi } from 'vitest'
import { book } from '../books/test-helpers.ts'
import { coverAddress } from '../search/openLibrary.ts'
import { downloadCover, isCoverAddress, TIMEOUT_MS, wantingCover, type Fetcher } from './download.ts'

const URL_1 = coverAddress(12354821)
const picture = (size: number, type = 'image/jpeg', status = 200) => new Response(new Uint8Array(size), { status, headers: { 'content-type': type } })

afterEach(() => vi.useRealTimers())

describe('downloadCover', () => {
  it('gives back the picture and its type', async () => {
    const asked: string[] = []
    const answer = await downloadCover(URL_1, async (url) => {
      asked.push(url)
      return picture(21_172)
    })
    expect(asked).toEqual([URL_1])
    expect(answer).toMatchObject({ kind: 'cover', type: 'image/jpeg' })
    expect(answer.kind === 'cover' && answer.bytes.byteLength).toBe(21_172)
  })

  it('takes a 404 as "this book has no cover"', async () => {
    expect(await downloadCover(URL_1, async () => new Response('not found', { status: 404 }))).toEqual({ kind: 'none' })
  })

  it('takes the 43-byte blank picture the same way', async () => {
    expect(await downloadCover(URL_1, async () => picture(43, 'image/gif'))).toEqual({ kind: 'none' })
  })

  it('tries again later after a server error, a web page in place of the picture, or a lost connection', async () => {
    expect(await downloadCover(URL_1, async () => picture(0, 'text/html', 503))).toEqual({ kind: 'later' })
    expect(await downloadCover(URL_1, async () => new Response('<html>Wi-Fi login</html>', { headers: { 'content-type': 'text/html; charset=utf-8' } }))).toEqual({ kind: 'later' })
    expect(await downloadCover(URL_1, () => Promise.reject(new TypeError('Failed to fetch')))).toEqual({ kind: 'later' })
  })

  it('gives up on a stalled download and tries again later', async () => {
    vi.useFakeTimers()
    const hanging: Fetcher = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
    const answer = downloadCover(URL_1, hanging)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    expect(await answer).toEqual({ kind: 'later' })
  })
})

describe('isCoverAddress', () => {
  it('takes only an https address of a cover source the app knows', () => {
    expect(isCoverAddress(URL_1)).toBe(true)
    expect(isCoverAddress('http://covers.openlibrary.org/b/id/1-M.jpg')).toBe(false)
    expect(isCoverAddress('https://example.com/b/id/1-M.jpg')).toBe(false)
    expect(isCoverAddress('https://covers.openlibrary.org.example.com/1.jpg')).toBe(false)
    expect(isCoverAddress('not an address')).toBe(false)
  })
})

describe('wantingCover', () => {
  const books = [book({ id: 'a', coverUrl: URL_1 }), book({ id: 'b' }), book({ id: 'c', coverUrl: coverAddress(6878782) }), book({ id: 'd', coverUrl: 'https://example.com/x.jpg' })]

  it('lists the books that name a cover the app may fetch and does not have yet', () => {
    expect(wantingCover(books, new Set(), new Set()).map(({ id }) => id)).toEqual(['a', 'c'])
    expect(wantingCover(books, new Set(['a']), new Set()).map(({ id }) => id)).toEqual(['c'])
  })

  it('leaves out the ones already asked for in vain', () => {
    expect(wantingCover(books, new Set(), new Set(['c'])).map(({ id }) => id)).toEqual(['a'])
    expect(wantingCover(books, new Set(['a']), new Set(['c']))).toEqual([])
  })
})
