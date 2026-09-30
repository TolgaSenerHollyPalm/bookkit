import { describe, expect, it } from 'vitest'
import annaKarenina from './fixtures/anna-karenina.json'
import beyazDis from './fixtures/beyaz-dis.json'
import isbn1984 from './fixtures/isbn-1984.json'
import kafkaSahilde from './fixtures/kafka-sahilde.json'
import kurkMantolu from './fixtures/kurk-mantolu-madonna.json'
import sapiens from './fixtures/sapiens.json'
import sucVeCeza from './fixtures/suc-ve-ceza.json'
import tanpinar from './fixtures/tanpinar.json'
import { coverAddress, readAnswer, searchAddress } from './openLibrary.ts'
import { cleanResults } from './results.ts'

// The fixtures are Open Library's own answers of 30 September 2026, cut to their first records.
const shown = (answer: unknown, typed: string) => cleanResults(readAnswer(answer, typed), typed)

describe('searchAddress', () => {
  it('asks for the words as they were typed, for Turkish editions', () => {
    const address = new URL(searchAddress('  saatleri ayarlama  '))
    expect(address.origin + address.pathname).toBe('https://openlibrary.org/search.json')
    expect(address.searchParams.get('q')).toBe('saatleri ayarlama')
    expect(address.searchParams.get('lang')).toBe('tr')
    expect(address.searchParams.get('limit')).toBe('40')
    expect(address.searchParams.get('fields')).toContain('editions.title')
  })

  it('looks an ISBN up as an ISBN, with or without hyphens, and an ISBN-10 as its ISBN-13', () => {
    expect(new URL(searchAddress('978-975-07-1853-3')).searchParams.get('q')).toBe('isbn:9789750718533')
    expect(new URL(searchAddress('9789750718533')).searchParams.get('q')).toBe('isbn:9789750718533')
    expect(new URL(searchAddress('9750718534')).searchParams.get('q')).toBe('isbn:9789750718533')
  })

  it('searches a number that is not an ISBN as words', () => {
    expect(new URL(searchAddress('1984')).searchParams.get('q')).toBe('1984')
  })
})

describe('coverAddress', () => {
  it('asks for the medium cover by its id, and for a 404 when there is none', () => {
    expect(coverAddress(12354821)).toBe('https://covers.openlibrary.org/b/id/12354821-M.jpg?default=false')
  })
})

describe('an author search: "tanpınar"', () => {
  const books = shown(tanpinar, 'tanpınar')

  it('folds the three records of Saatleri Ayarlama Enstitüsü into one, with the cover and ISBN one of them has', () => {
    expect(books[0]).toEqual({
      id: 'OL26405671W',
      title: 'Saatleri Ayarlama Enstitüsü',
      authors: ['Ahmet Hamdi Tanpınar'],
      isbn: '9789759955762',
      isbns: ['9789759955762'],
      coverUrl: coverAddress(12354821),
      turkish: true,
    })
    expect(books.filter((book) => book.title.toLocaleLowerCase('tr').startsWith('saatleri'))).toHaveLength(1)
  })

  it('leaves out the record with wrongly decoded text', () => {
    expect(JSON.stringify(tanpinar)).toContain('ï¿½')
    expect(JSON.stringify(books)).not.toContain('ï¿½')
    expect(readAnswer(tanpinar, 'tanpınar')).toHaveLength(tanpinar.docs.length - 1)
  })

  it('shows Huzur once, with the cover its later record has', () => {
    const huzur = books.filter((book) => book.title === 'Huzur')
    expect(huzur).toHaveLength(1)
    expect(huzur[0]).toMatchObject({ authors: ['Ahmet Hamdi Tanpınar'], coverUrl: coverAddress(6878782), isbn: '9789750801754' })
  })

  it('puts the Turkish editions before the translations', () => {
    const firstForeign = books.findIndex((book) => !book.turkish)
    expect(firstForeign).toBeGreaterThan(0)
    expect(books.slice(firstForeign).every((book) => !book.turkish)).toBe(true)
    expect(books.find((book) => !book.turkish)?.title).toBe('A Mind at Peace')
  })
})

describe('a translated classic: "suç ve ceza"', () => {
  const books = shown(sucVeCeza, 'suç ve ceza')

  it('shows the Turkish editions as one book, under the Turkish name', () => {
    expect(books.map((book) => book.title)).toEqual(['Suç ve Ceza', 'Ortaçağ Türk Devletlerinde Suç ve Ceza'])
    expect(books[0].isbns).toHaveLength(5)
    expect(books[0]).toMatchObject({ isbn: '9786257907637', coverUrl: coverAddress(10854232), turkish: true })
  })

  it('names the author in Latin letters, by the name most of the catalogue’s other names agree on', () => {
    expect(sucVeCeza.docs[0].author_name).toEqual(['Фёдор Михайлович Достоевский'])
    expect(books[0].authors).toEqual(['Fedor Dostoievski'])
  })

  it('finds the same book when it is typed without the Turkish letters', () => {
    expect(shown(sucVeCeza, 'suc ve ceza')[0]).toMatchObject({ title: 'Suç ve Ceza', authors: ['Fedor Dostoievski'] })
  })
})

describe('records typed in ASCII: "beyaz diş"', () => {
  it('shows twelve records as one book, spelled as the few good ones spell it', () => {
    expect(beyazDis.docs.filter((doc) => doc.title === 'Beyaz Dis')).toHaveLength(9)
    const books = shown(beyazDis, 'beyaz dis')
    expect(books).toHaveLength(1)
    expect(books[0]).toMatchObject({ title: 'Beyaz Diş', authors: ['Jack London'], isbn: '9789756841181', turkish: true })
    expect(books[0].isbns).toHaveLength(13)
  })
})

describe('records that name a publisher as the author: "kürk mantolu madonna"', () => {
  const books = shown(kurkMantolu, 'Kürk Mantolu Madonna')

  it('folds them, and the ones that name nobody, into the author’s own row', () => {
    expect(kurkMantolu.docs.map((doc) => doc.author_name?.[0])).toContain('Olimpos Yayınları')
    expect(books.filter((book) => book.title === 'Kürk Mantolu Madonna')).toHaveLength(1)
    expect(books[0]).toMatchObject({ title: 'Kürk Mantolu Madonna', authors: ['Sabahattin Ali'], isbn: '9789753638029' })
    expect(books.flatMap((book) => book.authors).some((name) => name.includes('Yayınları'))).toBe(false)
  })

  it('keeps the other editions and the translations as rows of their own, Turkish first', () => {
    expect(books.map((book) => book.title)).toEqual([
      'Kürk Mantolu Madonna',
      'Resimli Kürk Mantolu Madonna',
      'Kürk Mantolu Madonna ; Özel Baski',
      'Kürk Mantolu Madonna. Büyük Hikâye',
      'Kürk Mantolu Madonna; Zamansiz Eserler 5',
      'Sabahattin Ali 3 Roman',
      'Madonna in a fur coat',
      'Đức Mẹ mặc áo choàng lông',
    ])
  })
})

describe('a work and its edition under different names: "sapiens"', () => {
  it('shows the work’s name when that is exactly what was typed', () => {
    expect(shown(sapiens, 'sapiens')[0]).toMatchObject({ title: 'Sapiens', authors: ['Yuval Noah Harari'], isbn: '9786055029357', coverUrl: coverAddress(12130527) })
  })

  it('shows the Turkish edition’s name otherwise, with the letters the reader typed', () => {
    expect(shown(sapiens, 'hayvanlardan tanrılara')[0].title).toBe('Hayvanlardan Tanrılara - Sapiens Insan Turunun Kisa Bir Tarihi')
  })

  it('drops an author that is a publisher', () => {
    expect(sapiens.docs[2].author_name).toEqual(['Sapiens Editorial'])
    expect(shown(sapiens, 'sapiens')[2].authors).toEqual([])
  })
})

describe('an author in another script', () => {
  it('names Murakami and Tolstoy in Latin letters', () => {
    expect(kafkaSahilde.docs[0].author_name).toEqual(['村上春樹'])
    expect(shown(kafkaSahilde, 'kafka sahilde')[0]).toMatchObject({ title: 'Sahilde Kafka', authors: ['Haruki Murakami'], turkish: true })
    expect(shown(annaKarenina, 'anna karenina')[0]).toMatchObject({ title: 'Anna Karenina', authors: ['Lev Tolstoi'], turkish: true })
  })

  it('keeps the three volumes’ ISBNs of one edition, each once', () => {
    expect(shown(annaKarenina, 'anna karenina')[0].isbns).toEqual(['9789759099541', '9789759099558', '9789759099565'])
  })
})

describe('an ISBN search', () => {
  it('shows the edition that has the ISBN, under the edition’s own name', () => {
    expect(isbn1984.docs[0].title).toBe('Nineteen Eighty-Four')
    expect(shown(isbn1984, '978-975-07-1853-3')).toEqual([{ id: 'OL1168083W', title: '1984', authors: ['George Orwell'], isbn: '9789750718533', isbns: ['9789750718533'], turkish: true }])
  })

  it('shows nothing for an ISBN the catalogue does not have', () => {
    expect(shown({ numFound: 0, docs: [] }, '9786259029290')).toEqual([])
  })
})

describe('the cover of an edition that has none of its own', () => {
  const doc = (language: string[]) => ({ key: '/works/OL1W', title: 'Gizli Yüz', author_name: ['Orhan Pamuk'], cover_i: 6628510, language, editions: { docs: [{ title: 'Gizli Yüz', language: ['tur'] }] } })

  it('is the work’s, when the work is in one language', () => {
    expect(shown({ docs: [doc(['tur'])] }, 'gizli yüz')[0].coverUrl).toBe(coverAddress(6628510))
  })

  it('is left out when the work is in several: its cover may be another language’s', () => {
    expect(isbn1984.docs[0].language.length).toBeGreaterThan(1)
    expect(shown(isbn1984, '1984')[0].coverUrl).toBeUndefined()
    expect(shown({ docs: [doc(['tur', 'eng'])] }, 'gizli yüz')[0].coverUrl).toBeUndefined()
  })
})

describe('readAnswer', () => {
  it('refuses an answer that is not a list of records', () => {
    expect(() => readAnswer({ error: 'down' }, 'huzur')).toThrow()
    expect(() => readAnswer(null, 'huzur')).toThrow()
  })

  it('skips a record it cannot make sense of', () => {
    const docs = [null, 'text', { title: 'No key' }, { key: '/works/OL1W' }, { key: '/works/OL2W', title: 'Huzur', author_name: 'not a list', editions: { docs: 'nor this' } }]
    expect(readAnswer({ docs }, 'huzur')).toEqual([{ id: 'OL2W', title: 'Huzur', authors: [], authorIds: [], isbns: [], turkish: false }])
  })
})
