import type { Book } from './types.ts'

// Apostrophes and sentence punctuation vanish, so "Levin’in" stays one word; anything else that is not a letter
// or a digit separates words, as the hyphen in "Aşk-ı Memnu" does.
const DROPPED = /['’‘ʼ.,;:!?"“”«»]/g

/** What two spellings of the same title or name have in common: "SAATLERİ  AYARLAMA Enstitüsü" → "saatleri ayarlama enstitusu". */
export function matchKey(text: string): string {
  return text
    .normalize('NFC')
    .toLocaleLowerCase('tr')
    .replace(DROPPED, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // ş → s, ğ → g, ü → u, â → a …
    .replaceAll('ı', 'i') // the one Turkish letter that does not decompose
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

type Matchable = Pick<Book, 'title' | 'authors' | 'isbn'>

/** The same ISBN, or the same title by the same first author (or by no author on both sides). */
export function sameBook(a: Matchable, b: Matchable): boolean {
  if (a.isbn !== undefined && a.isbn === b.isbn) return true
  const title = matchKey(a.title)
  if (title === '' || title !== matchKey(b.title)) return false
  if (a.authors.length === 0 || b.authors.length === 0) return a.authors.length === b.authors.length
  return matchKey(a.authors[0]) === matchKey(b.authors[0])
}

/** The book already in the library that `candidate` would repeat; `exceptId` skips the book being edited. */
export function findSame<T extends Matchable & { id: string }>(books: readonly T[], candidate: Matchable, exceptId?: string): T | undefined {
  return books.find((book) => book.id !== exceptId && sameBook(book, candidate))
}

const SMALL_WORDS = new Set(['ve', 'ile', 'de', 'da', 'ki', 'mi'])

/**
 * "SAATLERİ AYARLAMA ENSTİTÜSÜ" → "Saatleri Ayarlama Enstitüsü". Only a title written all in capitals is touched;
 * `locale` is Turkish unless the caller knows better, since "I" lowers to "ı" in Turkish and to "i" elsewhere.
 */
export function displayTitle(title: string, locale = 'tr'): string {
  const lower = title.toLocaleLowerCase(locale)
  if (title !== title.toLocaleUpperCase(locale) || title === lower) return title
  return lower
    .split(' ')
    .map((word, index) => (index > 0 && SMALL_WORDS.has(word) ? word : word.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase(locale))))
    .join(' ')
}
