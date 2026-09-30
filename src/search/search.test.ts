import { afterEach, describe, expect, it, vi } from 'vitest'
import tanpinar from './fixtures/tanpinar.json'
import { searchBooks, TIMEOUT_MS, type Fetcher } from './search.ts'
import { canSearch, queryOf, searchState } from './state.ts'

const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
// A request that never answers, but gives up when it is told to, or was told to beforehand, as fetch does.
const hanging: Fetcher = (_url, { signal }) =>
  new Promise((_resolve, reject) => {
    const giveUp = () => reject(new DOMException('Aborted', 'AbortError'))
    if (signal.aborted) giveUp()
    signal.addEventListener('abort', giveUp)
  })
const never = new AbortController().signal

afterEach(() => vi.useRealTimers())

describe('searchBooks', () => {
  it('asks for what was typed and gives back the tidied books', async () => {
    const asked: string[] = []
    const books = await searchBooks('tanpınar', never, async (url) => {
      asked.push(url)
      return answer(tanpinar)
    })
    expect(new URL(asked[0]).searchParams.get('q')).toBe('tanpınar')
    expect(books[0]).toMatchObject({ title: 'Saatleri Ayarlama Enstitüsü', authors: ['Ahmet Hamdi Tanpınar'] })
  })

  it('gives back an empty list when nothing was found', async () => {
    expect(await searchBooks('qqqq', never, async () => answer({ numFound: 0, docs: [] }))).toEqual([])
  })

  it('fails when the source answers with an error, or with something that is not an answer', async () => {
    await expect(searchBooks('huzur', never, async () => answer({}, 503))).rejects.toThrow('503')
    await expect(searchBooks('huzur', never, async () => answer({ error: 'down' }))).rejects.toThrow()
    await expect(searchBooks('huzur', never, async () => new Response('<html>Wi-Fi login</html>'))).rejects.toThrow()
  })

  it('fails when the connection does', async () => {
    await expect(searchBooks('huzur', never, () => Promise.reject(new TypeError('Failed to fetch')))).rejects.toThrow('Failed to fetch')
  })

  it('gives up after eight seconds', async () => {
    vi.useFakeTimers()
    const search = searchBooks('huzur', never, hanging)
    const failed = expect(search).rejects.toThrow('Aborted')
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1)
    await vi.advanceTimersByTimeAsync(1)
    await failed
  })

  it('stops the request when it is cancelled, before or after it started', async () => {
    const controller = new AbortController()
    const search = searchBooks('huzur', controller.signal, hanging)
    controller.abort()
    await expect(search).rejects.toThrow('Aborted')

    let signal: AbortSignal | undefined
    await expect(
      searchBooks('huzur', controller.signal, (_url, init) => {
        signal = init.signal
        return hanging(_url, init)
      }),
    ).rejects.toThrow()
    expect(signal?.aborted).toBe(true)
  })
})

describe('searchState', () => {
  const books = [{ id: 'W1', title: 'Huzur', authors: [], isbns: [], turkish: true }]

  it('does not search for less than two characters', () => {
    expect(canSearch(queryOf(' h '))).toBe(false)
    expect(canSearch(queryOf('hu'))).toBe(true)
    expect(canSearch('ş')).toBe(false)
    expect(searchState('h', 0, true, undefined)).toEqual({ phase: 'idle' })
    expect(searchState('', 0, true, { query: '', attempt: 0, books })).toEqual({ phase: 'idle' })
  })

  it('treats spare spaces as the same search', () => {
    expect(queryOf('  suç   ve ceza ')).toBe('suç ve ceza')
  })

  it('is loading until the answer to what is typed now has come', () => {
    expect(searchState('huzur', 0, true, undefined)).toEqual({ phase: 'loading' })
    expect(searchState('huzur', 0, true, { query: 'huzu', attempt: 0, books })).toEqual({ phase: 'loading' })
    expect(searchState('huzur', 0, true, { query: 'huzur', attempt: 0, books })).toEqual({ phase: 'done', books })
  })

  it('says there is no connection instead of waiting for one', () => {
    expect(searchState('huzur', 0, false, undefined)).toEqual({ phase: 'offline' })
    expect(searchState('huzur', 0, false, { query: 'huzur', attempt: 0 })).toEqual({ phase: 'offline' })
  })

  it('keeps showing what was found when the connection drops afterwards', () => {
    expect(searchState('huzur', 0, false, { query: 'huzur', attempt: 0, books })).toEqual({ phase: 'done', books })
  })

  it('reports a failed search, and searches again on a new attempt', () => {
    expect(searchState('huzur', 0, true, { query: 'huzur', attempt: 0 })).toEqual({ phase: 'failed' })
    expect(searchState('huzur', 1, true, { query: 'huzur', attempt: 0 })).toEqual({ phase: 'loading' })
  })
})
