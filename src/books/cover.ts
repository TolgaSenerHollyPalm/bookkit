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
