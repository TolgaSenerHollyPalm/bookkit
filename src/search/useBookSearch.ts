import { useOnline } from 'kitshelf-ui/ui/useOnline.ts'
import { useEffect, useState } from 'react'
import { searchBooks } from './search.ts'
import { queryOf, searchState, type Outcome, type SearchState } from './state.ts'

const DEBOUNCE_MS = 400
// Open Library asks a client that does not identify itself, as a browser cannot, for one request a second at most.
const MIN_GAP_MS = 1000
let lastRequestAt = 0

/** Searches for what is typed once the typing pauses; a newer search cancels the one before it. */
export function useBookSearch(text: string): { query: string; state: SearchState; retry: () => void } {
  const query = queryOf(text)
  const online = useOnline()
  const [attempt, setAttempt] = useState(0)
  const [outcome, setOutcome] = useState<Outcome>()
  const state = searchState(query, attempt, online, outcome)
  const waiting = state.phase === 'loading'

  useEffect(() => {
    if (!waiting) return undefined
    const controller = new AbortController()
    const timer = setTimeout(
      () => {
        lastRequestAt = Date.now()
        searchBooks(query, controller.signal).then(
          (books) => {
            if (!controller.signal.aborted) setOutcome({ query, attempt, books })
          },
          (error: unknown) => {
            if (controller.signal.aborted) return
            console.error(error)
            // Without a connection nothing is recorded: the screen says so, and searches again when it is back.
            if (navigator.onLine) setOutcome({ query, attempt })
          },
        )
      },
      Math.max(DEBOUNCE_MS, lastRequestAt + MIN_GAP_MS - Date.now()),
    )
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [waiting, query, attempt])

  return { query, state, retry: () => setAttempt((count) => count + 1) }
}
