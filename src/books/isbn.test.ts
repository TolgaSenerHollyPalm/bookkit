import { describe, expect, it } from 'vitest'
import { parseIsbn } from './isbn.ts'

describe('parseIsbn', () => {
  it('reads an ISBN-13 with or without hyphens and spaces', () => {
    expect(parseIsbn('9780306406157')).toBe('9780306406157')
    expect(parseIsbn('978-0-306-40615-7')).toBe('9780306406157')
    expect(parseIsbn(' 978 0 306 40615 7 ')).toBe('9780306406157')
  })

  it('turns an ISBN-10 into the ISBN-13 of the same book', () => {
    expect(parseIsbn('0-306-40615-2')).toBe('9780306406157')
    expect(parseIsbn('0-8044-2957-X')).toBe('9780804429573')
    expect(parseIsbn('080442957x')).toBe('9780804429573')
  })

  it('takes nothing whose check digit does not fit, so the text is searched as words', () => {
    expect(parseIsbn('9780306406158')).toBeUndefined()
    expect(parseIsbn('0-306-40615-3')).toBeUndefined()
    expect(parseIsbn('030640615X')).toBeUndefined()
  })

  it('takes no other number or text', () => {
    expect(parseIsbn('4006381333931')).toBeUndefined() // a valid barcode, but not of a book
    expect(parseIsbn('12345')).toBeUndefined()
    expect(parseIsbn('tanpınar')).toBeUndefined()
    expect(parseIsbn('')).toBeUndefined()
  })
})
