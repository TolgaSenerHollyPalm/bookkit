import { parseIsbn } from '../books/isbn.ts'
import { matchKey } from '../books/match.ts'
import type { Candidate } from './results.ts'
import { bestSpelled, commonLatinName, fixCaps, hasTurkishLetters, isBroken, isLatin, tidyName, tidyTitle } from './spelling.ts'

const FIELDS = ['key', 'title', 'author_name', 'author_key', 'author_alternative_name', 'cover_i', 'language', 'editions', 'editions.key', 'editions.title', 'editions.language', 'editions.cover_i', 'editions.isbn']
// More than a screenful: the same book often comes back as several records, which fold into one row.
const ROWS = 40

/** The address that asks Open Library for a search; an ISBN is looked up as one, anything else as words. */
export function searchAddress(typed: string): string {
  const isbn = parseIsbn(typed)
  // `lang` makes the edition named for each work a Turkish one where the work has any.
  const params = new URLSearchParams({ q: isbn ? `isbn:${isbn}` : typed.trim(), fields: FIELDS.join(','), limit: String(ROWS), lang: 'tr' })
  return `https://openlibrary.org/search.json?${params}`
}

/** A cover by its id, which Open Library serves without a rate limit; a missing one answers 404, not a blank. */
export const coverAddress = (coverId: number): string => `https://covers.openlibrary.org/b/id/${coverId}-M.jpg?default=false`

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])
const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value : undefined)
const coverOf = (value: unknown): string | undefined => (typeof value === 'number' && value > 0 ? coverAddress(value) : undefined)
const record = (value: unknown): Record<string, unknown> | undefined => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined)

// The registration groups of Turkey: a book with such an ISBN came out there, whatever its record says of language.
const TURKISH_ISBN = /^978(605|625|975|9944)/
// Who a catalogue names where it has no author: the publisher, or "collective".
const NOT_A_PERSON = /(^| )(yayinlari|yayinevi|yayincilik|kitabevi|publishing|publishers|publications|editorial|collective|kolektif)( |$)/

// A work is filed under its original name; the edition under it is the one that matched, in Turkish when there is one.
function pickTitle(editionTitle: string | undefined, workTitle: string | undefined, typed: string): string | undefined {
  const titles = [editionTitle, workTitle].filter((title) => title !== undefined).map(tidyTitle)
  if (titles.length === 0) return undefined
  // Typing exactly the work's name asks for that name: "sapiens" is "Sapiens", whatever the edition is called.
  const picked = titles.find((title) => matchKey(title) === matchKey(typed)) ?? titles[0]
  return bestSpelled([picked, ...titles.filter((title) => matchKey(title) === matchKey(picked))])
}

function readAuthors(work: Record<string, unknown>, turkish: boolean): string[] {
  const seen = new Set<string>()
  const names = strings(work.author_name)
    .map(tidyName)
    .filter((name) => {
      const key = matchKey(name)
      if (key === '' || seen.has(key)) return false
      seen.add(key)
      return true
    })
  if (names.every((name) => NOT_A_PERSON.test(matchKey(name)))) return []
  if (names.every(isLatin)) return names.map((name) => fixCaps(name, turkish))
  // "Фёдор Михайлович Достоевский": one of the author's other names stands in for the first such name.
  const other = commonLatinName(strings(work.author_alternative_name))
  if (!other) return names
  const at = names.findIndex((name) => !isLatin(name))
  return names.flatMap((name, index) => (isLatin(name) ? [fixCaps(name, turkish)] : index === at ? [other] : []))
}

function toCandidate(doc: unknown, typed: string): Candidate | undefined {
  const work = record(doc)
  if (!work) return undefined
  const docs = record(work.editions)?.docs
  const edition = record(Array.isArray(docs) ? docs[0] : undefined)
  const id = text(work.key)?.split('/').at(-1)
  const given = [text(edition?.title), text(work.title), ...strings(work.author_name)]
  if (!id || given.some((value) => value !== undefined && isBroken(value))) return undefined

  const isbns = [...new Set(strings(edition?.isbn).map(parseIsbn).filter((isbn) => isbn !== undefined))]
  const picked = pickTitle(text(edition?.title), text(work.title), typed)
  if (!picked) return undefined
  const languages = strings(edition?.language)
  const workLanguages = strings(work.language)
  const turkish =
    languages.includes('tur') || (languages.length === 0 && workLanguages.length === 1 && workLanguages[0] === 'tur') || isbns.some((isbn) => TURKISH_ISBN.test(isbn)) || hasTurkishLetters(picked)

  const authors = readAuthors(work, turkish)
  const authorKey = strings(work.author_key)[0]
  const candidate: Candidate = {
    id,
    title: fixCaps(picked, turkish),
    authors,
    authorIds: authors.length === 0 ? [] : [authorKey, matchKey(authors[0])].filter((value) => value !== undefined && value !== ''),
    isbns,
    turkish,
  }
  const cover = coverOf(edition?.cover_i)
  // A work in several languages keeps one cover for all of them: a Turkish edition would wear a foreign one.
  const looseCover = workLanguages.length <= 1 ? coverOf(work.cover_i) : undefined
  if (cover) candidate.cover = cover
  if (looseCover) candidate.looseCover = looseCover
  return candidate
}

/** The records of an answer that can be shown; a record with wrongly decoded text is left out. */
export function readAnswer(body: unknown, typed: string): Candidate[] {
  const docs = record(body)?.docs
  if (!Array.isArray(docs)) throw new Error('Open Library answered without a list of records')
  return docs.map((doc) => toCandidate(doc, typed)).filter((candidate) => candidate !== undefined)
}
