import type { FoundBook } from './results.ts'

export const MIN_LENGTH = 2

/** What a finished request left behind; without `books` it failed. */
export interface Outcome {
  query: string
  attempt: number
  books?: FoundBook[]
}

export type SearchState =
  | { phase: 'idle' } // too little typed to search for
  | { phase: 'loading' }
  | { phase: 'done'; books: FoundBook[] }
  | { phase: 'offline' }
  | { phase: 'failed' }

/** The text as it is searched: spaces at the ends and doubled ones do not make a new search. */
export const queryOf = (text: string): string => text.trim().replace(/\s+/g, ' ')

export const canSearch = (query: string): boolean => [...query].length >= MIN_LENGTH

/** What the search screen shows, from what is typed, whether there is a connection, and the last answer. */
export function searchState(query: string, attempt: number, online: boolean, outcome: Outcome | undefined): SearchState {
  if (!canSearch(query)) return { phase: 'idle' }
  if (outcome?.query === query && outcome.attempt === attempt) {
    if (outcome.books) return { phase: 'done', books: outcome.books }
    return { phase: online ? 'failed' : 'offline' }
  }
  return { phase: online ? 'loading' : 'offline' }
}
