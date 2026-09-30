import { parseIsbn } from '../books/isbn.ts'
import { matchKey } from '../books/match.ts'
import { bestSpelled, respell, turkishTitle } from './spelling.ts'

/** One record of a source, read and tidied but not yet compared with the others. */
export interface Candidate {
  id: string // the source's own id for the work
  title: string
  authors: string[]
  authorIds: string[] // what tells the first author apart: the source's key for them, and their name folded
  isbns: string[] // ISBN-13
  cover?: string // the address of this very edition's cover
  looseCover?: string // of a cover the source keeps for the work, maybe from another edition
  turkish: boolean
}

/** A book a search found, as its row shows it and as it would be added to the library. */
export interface FoundBook {
  id: string
  title: string
  authors: string[]
  isbn?: string
  isbns: string[] // of every record folded into this one: tells whether the library has the book already
  coverUrl?: string
  turkish: boolean
}

export const MAX_RESULTS = 20

interface Group {
  titleKey: string
  authorIds: Set<string>
  members: Candidate[]
}

// A catalogue holds the same book many times over. Two records are one book when the title folds to the same key
// and the first author is the same person; a record that names no author goes with the first of its title.
function groupSame(candidates: readonly Candidate[]): Group[] {
  const groups: Group[] = []
  for (const candidate of candidates) {
    const titleKey = matchKey(candidate.title)
    if (titleKey === '') continue
    const sameTitle = groups.filter((group) => group.titleKey === titleKey)
    const same =
      candidate.authorIds.length === 0
        ? sameTitle[0]
        : (sameTitle.find((group) => candidate.authorIds.some((id) => group.authorIds.has(id))) ?? sameTitle.find((group) => group.authorIds.size === 0))
    if (same) {
      same.members.push(candidate)
      for (const id of candidate.authorIds) same.authorIds.add(id)
    } else {
      groups.push({ titleKey, authorIds: new Set(candidate.authorIds), members: [candidate] })
    }
  }
  return groups
}

function toFound({ members }: Group, typed: string, typedIsbn: string | undefined): FoundBook {
  const turkish = members.some((member) => member.turkish)
  const pool = turkish ? members.filter((member) => member.turkish) : members
  // The record whose ISBN was asked for, else the first with its own cover: its ISBN and cover go together.
  const base =
    members.find((member) => typedIsbn !== undefined && member.isbns.includes(typedIsbn)) ??
    pool.find((member) => member.cover) ??
    pool.find((member) => member.looseCover) ??
    pool[0]
  const spelled = bestSpelled(members.map((member) => member.title))
  const title = turkish ? turkishTitle(spelled) : spelled

  const authors = [...(base.authors.length > 0 ? base : (members.find((member) => member.authors.length > 0) ?? base)).authors]
  if (authors.length > 0) {
    const firstKey = matchKey(authors[0])
    authors[0] = bestSpelled([authors[0], ...members.flatMap((member) => member.authors.slice(0, 1)).filter((name) => matchKey(name) === firstKey)])
  }

  const isbns = [...new Set(members.flatMap((member) => member.isbns))]
  const isbn = typedIsbn !== undefined && isbns.includes(typedIsbn) ? typedIsbn : base.isbns[0]
  const found: FoundBook = {
    id: base.id,
    // An ISBN says nothing about spelling; words the reader typed do.
    title: typedIsbn === undefined ? respell(title, typed) : title,
    authors: typedIsbn === undefined ? authors.map((name) => respell(name, typed)) : authors,
    isbns,
    turkish,
  }
  if (isbn) found.isbn = isbn
  const coverUrl = base.cover ?? base.looseCover
  if (coverUrl) found.coverUrl = coverUrl
  return found
}

/**
 * What a search shows: the source's records with the repeats folded into one row each, Turkish editions first,
 * in the source's own order otherwise, and no more than a screenful.
 */
export function cleanResults(candidates: readonly Candidate[], typed: string, limit = MAX_RESULTS): FoundBook[] {
  const found = groupSame(candidates).map((group) => toFound(group, typed, parseIsbn(typed)))
  return [...found.filter((book) => book.turkish), ...found.filter((book) => !book.turkish)].slice(0, limit)
}
