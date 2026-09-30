import { parseIsbn } from './isbn.ts'

/** "Lev Tolstoy, Bir Çevirmen" typed into one field → the list a book keeps. */
export const parseAuthors = (text: string): string[] =>
  text
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

/** The ISBN field of a form: empty is fine, anything else has to be a real ISBN. */
export function readIsbnField(text: string): { isbn?: string; problem?: string } {
  if (text.trim() === '') return {}
  const isbn = parseIsbn(text)
  return isbn ? { isbn } : { problem: 'Bu ISBN geçerli görünmüyor.' }
}
