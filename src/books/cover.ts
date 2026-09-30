import { matchKey } from './match.ts'

/** The colours a drawn cover can have; each keeps 5.1:1 or more against the cover's text. */
export const COVER_COLORS = ['#2F5D50', '#8C5E1C', '#3E5C76', '#A0522D', '#5A4A78', '#4F5B3A']
export const COVER_TEXT = '#FFF4E6'

/** The colour of a book without a cover picture: picked by its title, so the same book always looks the same. */
export function coverColor(title: string): string {
  // FNV-1a over the normalized title; changing it would recolour every shelf.
  let hash = 0x811c9dc5
  for (const char of matchKey(title)) hash = Math.imul(hash ^ char.codePointAt(0)!, 0x01000193)
  return COVER_COLORS[(hash >>> 0) % COVER_COLORS.length]
}

// How wide each character is in Bricolage Grotesque 700, in em, measured from the font and rounded into groups.
const ADVANCES: [em: number, chars: string][] = [
  [0.22, " ’'.,:;"],
  [0.28, 'lıijIİ!'],
  [0.34, '()1-J'],
  [0.41, 'ft?r'],
  [0.52, 'L7zsş'],
  [0.59, 'cçvxTZeakFgğy2'],
  [0.63, 'oö35uüE4hnbdpqY'],
  [0.67, 'PSŞ96V80BCÇRK'],
  [0.72, 'ADXGĞHOÖQUÜ&'],
  [0.78, 'N'],
  [0.86, 'w'],
  [0.97, 'MmW'],
]
const ADVANCE = new Map(ADVANCES.flatMap(([em, chars]) => [...chars].map((char) => [char, em] as const)))
const OTHER = 0.65

/** The width of a word set in the cover's type, in em. */
export const wordEm = (word: string, spacing = 0): number => [...word].reduce((sum, char) => sum + (ADVANCE.get(char) ?? OTHER) + spacing, 0)

/**
 * The size a cover's title is set in: `base` px, or less when its longest word would not fit `width` px on one
 * line, but never under `floor`, where a word is rather broken in two.
 */
export function coverTitleSize(title: string, { base, width, floor, spacing }: { base: number; width: number; floor: number; spacing: number }): number {
  const longest = Math.max(...title.split(/\s+/).map((word) => wordEm(word, spacing)))
  // A little under the width: the advances are rounded, and a word that only just fits still breaks.
  const fitting = Math.floor(((width * 0.97) / longest) * 10) / 10
  return Math.max(floor, Math.min(base, fitting))
}
