import { matchKey } from '../books/match.ts'

/** A text that was decoded wrongly somewhere on its way into the catalogue: "Enstitï¿½sï¿½". */
export const isBroken = (text: string): boolean => /�|ï¿½/.test(text)

/** How many letters of a text are beyond plain ASCII; of two spellings of one name, the one with more lost less. */
export const accents = (text: string): number => (text.normalize('NFC').match(/[^\P{L}A-Za-z]/gu) ?? []).length

/** Of several spellings of the same name, the one that kept the most of its letters; the earliest of equals. */
export const bestSpelled = (spellings: readonly string[]): string => spellings.reduce((best, next) => (accents(next) > accents(best) ? next : best))

/** Letters no other language a catalogue is likely to hold shares with Turkish: a text with one is Turkish. */
export const hasTurkishLetters = (text: string): boolean => /[ıİğĞşŞ]/.test(text)

// A Turkish text that shows none of its own letters was most likely typed in ASCII, where "I" stands for "İ" too:
// only one that shows them gets the Turkish rule, in which "I" lowers to "ı".
const localeOf = (text: string): string | undefined => (/[ıİğĞşŞçÇöÖüÜ]/.test(text) ? 'tr' : undefined)

const isAllCaps = (text: string): boolean => text === text.toUpperCase() && text !== text.toLowerCase()

/**
 * "AHMET HAMDİ TANPINAR" → "Ahmet Hamdi Tanpınar"; a text that is not all in capitals comes back as it is.
 * `turkish` says the record is a Turkish one, so that a German "FÜNF" is not lowered by the Turkish rule.
 */
export function fixCaps(text: string, turkish: boolean): string {
  if (!isAllCaps(text)) return text
  const locale = turkish ? localeOf(text) : undefined
  return text.toLocaleLowerCase(locale).replace(/(^|[\s(.])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toLocaleUpperCase(locale))
}

// The words a Turkish title keeps small, by the Turkish Language Association's rule for headings.
const SMALL_WORDS = new Set(['ve', 'ile', 'ya', 'veya', 'yahut', 'ki', 'da', 'de', 'mı', 'mi', 'mu', 'mü'])

/**
 * A Turkish title the way a bookshop writes it: "Saatleri ayarlama enstitüsü" → "Saatleri Ayarlama Enstitüsü",
 * "Suç Ve Ceza" → "Suç ve Ceza". A word with a capital inside ("iPhone") is left alone.
 */
export function turkishTitle(title: string): string {
  const locale = localeOf(title)
  return title
    .split(' ')
    .map((word, index) => {
      if (index > 0 && SMALL_WORDS.has(word.toLocaleLowerCase('tr').replace(/\P{L}/gu, ''))) return word.toLocaleLowerCase('tr')
      if (word !== word.toLocaleLowerCase(locale)) return word
      return word.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase(locale))
    })
    .join(' ')
}

const spaced = (text: string): string => text.normalize('NFC').replace(/\s+/g, ' ').trim()

/** A title without a catalogue's trailing marks: "Yaban." → "Yaban", "Huzur /" → "Huzur". */
export const tidyTitle = (title: string): string =>
  spaced(title)
    .replace(/\s*[/:;,=]$/, '')
    .replace(/([^.\s])\.$/, '$1')

/** A name without the mark a catalogue left after it: "Rafael Carpintero;" → "Rafael Carpintero". */
export const tidyName = (name: string): string => spaced(name).replace(/\s*[;,]$/, '')

/**
 * The text with its words spelled as the user just typed them, where what they typed is the same word with more
 * of its Turkish letters: "Beyaz Dis" and the search "beyaz diş" give "Beyaz Diş". The capitals stay as they were.
 */
export function respell(text: string, typed: string): string {
  const typedWords = new Map(spaced(typed).split(' ').map((word) => [matchKey(word), [...word]] as const))
  return text
    .split(' ')
    .map((word) => {
      const chars = [...word]
      const better = typedWords.get(matchKey(word))
      if (!better || better.length !== chars.length || accents(better.join('')) <= accents(word)) return word
      // Letter for letter the same word; only then can the capitals be carried over by position.
      if (!chars.every((char, index) => matchKey(char) === matchKey(better[index]))) return word
      return chars.map((char, index) => (char === char.toLocaleLowerCase('tr') ? better[index].toLocaleLowerCase('tr') : better[index].toLocaleUpperCase('tr'))).join('')
    })
    .join(' ')
}

/** True for a name a Turkish reader can read: it has Latin letters, whatever else it holds. */
export const isLatin = (name: string): boolean => /\p{Script=Latin}/u.test(name)

/** A full name in Latin letters, written plainly: no initials, no "Surname, Name", no word all in capitals. */
export const isPlainLatinName = (name: string): boolean =>
  /^[\p{Script=Latin}\p{M}'’-]+( [\p{Script=Latin}\p{M}'’-]+)+$/u.test(name) && !name.split(' ').some((word) => word.length > 1 && isAllCaps(word))

/**
 * Of the many names a catalogue keeps for one author, a plain one in Latin letters, made of the words most of
 * them agree on: "Fyodor Dostoyevsky" rather than "Fedor Mihajlovič Dostoevskij".
 */
export function commonLatinName(names: readonly string[]): string | undefined {
  const plain = [...new Set(names.map(tidyName).filter(isPlainLatinName))]
  const votes = new Map<string, number>()
  for (const name of plain) for (const word of matchKey(name).split(' ')) votes.set(word, (votes.get(word) ?? 0) + 1)
  const score = (name: string) => {
    const words = matchKey(name).split(' ')
    return words.reduce((sum, word) => sum + (votes.get(word) ?? 0), 0) / words.length
  }
  // The order of equals must not depend on the order the catalogue happened to list them in.
  return plain.sort((a, b) => score(b) - score(a) || (a < b ? -1 : 1))[0]
}
