import { describe, expect, it } from 'vitest'
import { cleanResults, MAX_RESULTS, type Candidate } from './results.ts'

const LONDON = ['OL44633A', 'jack london']
const record = (id: string, title: string, fields: Partial<Candidate> = {}): Candidate => ({ id, title, authors: ['Jack London'], authorIds: LONDON, isbns: [], turkish: true, ...fields })

describe('cleanResults', () => {
  it('folds the records of one book into one row, spelled as the best of them spells it', () => {
    const found = cleanResults(
      [
        record('W1', 'Beyaz Dis', { isbns: ['9789756841181'], cover: 'cover-1' }),
        record('W2', 'Beyaz Dis', { isbns: ['9786052970171'] }),
        record('W3', 'Beyaz Diş', { isbns: ['9786051723297'], cover: 'cover-3' }),
      ],
      'beyaz dis',
    )
    expect(found).toEqual([{ id: 'W1', title: 'Beyaz Diş', authors: ['Jack London'], isbn: '9789756841181', isbns: ['9789756841181', '9786052970171', '9786051723297'], coverUrl: 'cover-1', turkish: true }])
  })

  it('takes the ISBN and the cover from the same record: the first that has a cover of its own', () => {
    const [book] = cleanResults(
      [
        record('W1', 'Huzur', { isbns: ['9789750801754'] }),
        record('W2', 'Huzur', { isbns: ['9789759955762'], looseCover: 'loose-2' }),
        record('W3', 'Huzur', { isbns: ['9786053602750'], cover: 'cover-3' }),
      ],
      'huzur',
    )
    expect(book).toMatchObject({ id: 'W3', isbn: '9786053602750', coverUrl: 'cover-3' })
  })

  it('falls back on a cover of the work, and then on no cover at all', () => {
    expect(cleanResults([record('W1', 'Huzur'), record('W2', 'Huzur', { looseCover: 'loose-2' })], 'huzur')[0]).toMatchObject({ id: 'W2', coverUrl: 'loose-2' })
    const [bare] = cleanResults([record('W1', 'Huzur')], 'huzur')
    expect(bare).toEqual({ id: 'W1', title: 'Huzur', authors: ['Jack London'], isbns: [], turkish: true })
  })

  it('knows the same author by the source’s key or by the name, however it is spelled', () => {
    const found = cleanResults(
      [
        record('W1', 'Huzur', { authors: ['Ahmet Hamdi Tanpinar'], authorIds: ['OL1A', 'ahmet hamdi tanpinar'] }),
        record('W2', 'Huzur', { authors: ['Ahmet Hamdi Tanpınar'], authorIds: ['OL2A', 'ahmet hamdi tanpinar'] }),
        record('W3', 'Huzur', { authors: ['A. H. Tanpınar'], authorIds: ['OL2A', 'a h tanpinar'] }),
      ],
      'huzur',
    )
    expect(found).toHaveLength(1)
    expect(found[0].authors).toEqual(['Ahmet Hamdi Tanpınar'])
  })

  it('keeps apart the same title by another author', () => {
    const found = cleanResults([record('W1', 'Kar', { authors: ['Orhan Pamuk'], authorIds: ['OL1A', 'orhan pamuk'] }), record('W2', 'Kar', { authors: ['Emre Gül'], authorIds: ['OL2A', 'emre gul'] })], 'kar')
    expect(found.map((book) => book.authors[0])).toEqual(['Orhan Pamuk', 'Emre Gül'])
  })

  it('puts a record that names no author with the first of its title, and takes the author from the one that has it', () => {
    const nameless = { authors: [], authorIds: [] }
    const after = cleanResults([record('W1', 'Beyaz Diş'), record('W2', 'Beyaz Dis', { ...nameless, isbns: ['9789752849419'] })], 'beyaz diş')
    expect(after).toEqual([{ id: 'W1', title: 'Beyaz Diş', authors: ['Jack London'], isbns: ['9789752849419'], turkish: true }])

    const before = cleanResults([record('W1', 'Beyaz Diş', { ...nameless, cover: 'cover-1' }), record('W2', 'Beyaz Diş')], 'beyaz diş')
    expect(before).toEqual([{ id: 'W1', title: 'Beyaz Diş', authors: ['Jack London'], isbns: [], coverUrl: 'cover-1', turkish: true }])
    expect(cleanResults([record('W1', 'Beyaz Diş', nameless)], 'beyaz diş')[0].authors).toEqual([])
  })

  it('writes a Turkish title the way a bookshop does, and leaves another language’s as it came', () => {
    expect(cleanResults([record('W1', 'Saatleri ayarlama enstitüsü')], 'tanpınar')[0].title).toBe('Saatleri Ayarlama Enstitüsü')
    expect(cleanResults([record('W1', 'The time regulation institute', { turkish: false })], 'tanpınar')[0].title).toBe('The time regulation institute')
  })

  it('spells the title and the authors with the Turkish letters the reader typed', () => {
    const [book] = cleanResults([record('W1', 'Dönüsüm', { authors: ['Ahmet Cemal', 'Franz Kafka'], authorIds: ['OL9A', 'ahmet cemal'] })], 'dönüşüm')
    expect(book.title).toBe('Dönüşüm')
    expect(cleanResults([record('W1', 'Huzur', { authors: ['Ahmet Hamdi Tanpinar'], authorIds: ['OL1A'] })], 'tanpınar')[0].authors).toEqual(['Ahmet Hamdi Tanpınar'])
  })

  it('puts the Turkish editions first and keeps the source’s order otherwise', () => {
    const found = cleanResults(
      [
        record('W1', 'Remembered Serenade', { turkish: false }),
        record('W2', 'Serenade', { turkish: false }),
        record('W3', 'Serenad'),
        record('W4', 'Elena’s serenade', { turkish: false }),
        record('W5', 'Serenad İçin Notlar'),
      ],
      'serenad',
    )
    expect(found.map((book) => book.id)).toEqual(['W3', 'W5', 'W1', 'W2', 'W4'])
  })

  it('makes the group Turkish when any record of it is, and takes cover and ISBN from a Turkish one', () => {
    const [book] = cleanResults(
      [record('W1', 'Anna Karenina', { turkish: false, isbns: ['9788324022151'], cover: 'polish' }), record('W2', 'Anna Karenina', { isbns: ['9789750737510'], cover: 'turkish' })],
      'anna karenina',
    )
    expect(book).toMatchObject({ id: 'W2', isbn: '9789750737510', coverUrl: 'turkish', turkish: true, isbns: ['9788324022151', '9789750737510'] })
  })

  it('keeps the ISBN that was asked for, and the record that has it', () => {
    const [book] = cleanResults(
      [record('W1', 'Anna Karenina', { isbns: ['9789759099541'], cover: 'cover-1' }), record('W2', 'Anna Karenina', { isbns: ['9789759099558', '9789759099565'] })],
      '978-975-9099-55-8',
    )
    expect(book).toMatchObject({ id: 'W2', isbn: '9789759099558' })
  })

  it('does not respell from an ISBN', () => {
    expect(cleanResults([record('W1', 'Beyaz Dis', { isbns: ['9789756841181'] })], '9789756841181')[0].title).toBe('Beyaz Dis')
  })

  it('leaves out a record whose title has no letters or digits, and shows no more than a screenful', () => {
    expect(cleanResults([record('W1', '—'), record('W2', 'Huzur')], 'huzur').map((book) => book.id)).toEqual(['W2'])
    const many = Array.from({ length: 30 }, (_, index) => record(`W${index}`, `Kitap ${index}`))
    expect(cleanResults(many, 'kitap')).toHaveLength(MAX_RESULTS)
    expect(cleanResults([], 'kitap')).toEqual([])
  })
})
