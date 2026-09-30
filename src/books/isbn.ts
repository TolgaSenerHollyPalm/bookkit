const digits = (text: string) => [...text].map(Number)

function validIsbn13(isbn: string): boolean {
  if (!/^97[89]\d{10}$/.test(isbn)) return false
  return digits(isbn).reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 1 : 3), 0) % 10 === 0
}

function validIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false
  const values = [...isbn].map((char) => (char === 'X' ? 10 : Number(char)))
  return values.reduce((sum, value, index) => sum + value * (10 - index), 0) % 11 === 0
}

/** An ISBN-10 as the ISBN-13 of the same book: 978 in front and a new check digit. */
function toIsbn13(isbn10: string): string {
  const body = `978${isbn10.slice(0, 9)}`
  const sum = digits(body).reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0)
  return `${body}${(10 - (sum % 10)) % 10}`
}

/**
 * The ISBN-13 that a search text or a form field holds, hyphens and spaces aside; undefined when the check digit
 * does not fit, so the text is searched as words instead.
 */
export function parseIsbn(text: string): string | undefined {
  const compact = text.replace(/[\s\-‐‑–]/g, '').toUpperCase()
  if (validIsbn13(compact)) return compact
  return validIsbn10(compact) ? toIsbn13(compact) : undefined
}
