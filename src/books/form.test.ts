import { describe, expect, it } from 'vitest'
import { parseAuthors, readIsbnField } from './form.ts'

describe('form fields', () => {
  it('split authors at commas and drop what is empty', () => {
    expect(parseAuthors('Lev Tolstoy')).toEqual(['Lev Tolstoy'])
    expect(parseAuthors(' Ahmet Hamdi Tanpınar ,  Bir Çevirmen,, ')).toEqual(['Ahmet Hamdi Tanpınar', 'Bir Çevirmen'])
    expect(parseAuthors('   ')).toEqual([])
  })

  it('take an empty ISBN, a real one, and nothing else', () => {
    expect(readIsbnField('  ')).toEqual({})
    expect(readIsbnField('0-306-40615-2')).toEqual({ isbn: '9780306406157' })
    expect(readIsbnField('12345')).toEqual({ problem: 'Bu ISBN geçerli görünmüyor.' })
  })
})
