import { useEffect, useRef, useState } from 'react'
import { googleKey, GoogleRefusal, searchGoogle, type GoogleBook } from './googleBooks.ts'

export type GoogleState =
  | { phase: 'loading' }
  | { phase: 'done'; books: GoogleBook[] }
  | { phase: 'failed'; quotaUsedUp: boolean }

/**
 * Google Books for the search text, asked only when the reader says so: its daily quota is shared by everyone
 * using the app, and what is typed should not go to Google unasked. A new text starts afresh.
 */
export function useGoogleSearch(query: string): { offered: boolean; state: GoogleState | undefined; ask: () => void } {
  const key = googleKey()
  const [answer, setAnswer] = useState<{ query: string; state: GoogleState }>()
  const request = useRef<AbortController>(undefined)

  useEffect(() => () => request.current?.abort(), [])

  const ask = () => {
    if (!key) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setAnswer({ query, state: { phase: 'loading' } })
    searchGoogle(query, key, controller.signal).then(
      (books) => {
        if (!controller.signal.aborted) setAnswer({ query, state: { phase: 'done', books } })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        console.error(error)
        setAnswer({ query, state: { phase: 'failed', quotaUsedUp: error instanceof GoogleRefusal && error.status === 429 } })
      },
    )
  }

  return { offered: key !== undefined, state: answer?.query === query ? answer.state : undefined, ask }
}
