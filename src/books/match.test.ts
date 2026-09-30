import { describe, expect, it } from 'vitest'
import { displayTitle, findSame, matchKey, sameBook } from './match.ts'

describe('matchKey', () => {
  it('folds case, spacing and Turkish letters', () => {
    expect(matchKey('SAATLERİ  AYARLAMA Enstitüsü')).toBe('saatleri ayarlama enstitusu')
    expect(matchKey('Aşk-ı Memnu')).toBe('ask i memnu')
    expect(matchKey('Tanpinar')).toBe('tanpinar')
    expect(matchKey('Tanpınar')).toBe('tanpinar')
  })

  it('drops apostrophes and punctuation, and lets anything else that is not a letter separate words', () => {
    expect(matchKey('Levin’in')).toBe('levinin')
    expect(matchKey("O'Brien")).toBe('obrien')
    expect(matchKey('Suç ve Ceza.')).toBe('suc ve ceza')
    expect(matchKey('Savaş ve Barış, Cilt 1')).toBe('savas ve baris cilt 1')
    expect(matchKey('Suç/Ceza (Tam Metin)')).toBe('suc ceza tam metin')
  })

  it('keeps digits, so "1984" is still a title', () => {
    expect(matchKey('1984')).toBe('1984')
    expect(matchKey('Fahrenheit 451')).toBe('fahrenheit 451')
  })

  it('folds the accents of other languages too, and an English I', () => {
    expect(matchKey('Gabriel García Márquez')).toBe('gabriel garcia marquez')
    expect(matchKey('DUNE: MESSIAH')).toBe('dune messiah')
  })
})

describe('sameBook', () => {
  const huzur = { title: 'Huzur', authors: ['Ahmet Hamdi Tanpınar'] }

  it('goes by the ISBN when both have the same one', () => {
    expect(sameBook({ title: 'Huzur', authors: [], isbn: '9789750800023' }, { title: 'A Mind at Peace', authors: ['Tanpinar'], isbn: '9789750800023' })).toBe(true)
  })

  it('takes the same title by the same first author, however they are spelled', () => {
    expect(sameBook(huzur, { title: 'HUZUR', authors: ['Ahmet Hamdi TANPINAR', 'Bir Çevirmen'] })).toBe(true)
    expect(sameBook({ ...huzur, isbn: '9789750800023' }, { ...huzur, isbn: '9786053602750' })).toBe(true)
  })

  it('takes the same title when neither has an author, not when only one has', () => {
    expect(sameBook({ title: 'Huzur', authors: [] }, { title: 'huzur', authors: [] })).toBe(true)
    expect(sameBook(huzur, { title: 'Huzur', authors: [] })).toBe(false)
  })

  it('tells apart another title, another author, and titles with no letters at all', () => {
    expect(sameBook(huzur, { title: 'Beş Şehir', authors: huzur.authors })).toBe(false)
    expect(sameBook(huzur, { title: 'Huzur', authors: ['Başka Biri'] })).toBe(false)
    expect(sameBook({ title: '?', authors: [] }, { title: '!', authors: [] })).toBe(false)
  })
})

describe('findSame', () => {
  const library = [
    { id: 'a', title: 'Huzur', authors: ['Ahmet Hamdi Tanpınar'] },
    { id: 'b', title: 'Beş Şehir', authors: ['Ahmet Hamdi Tanpınar'] },
  ]

  it('finds the book the library already has, skipping the one being edited', () => {
    expect(findSame(library, { title: 'huzur', authors: ['ahmet hamdi tanpinar'] })?.id).toBe('a')
    expect(findSame(library, { title: 'huzur', authors: ['ahmet hamdi tanpinar'] }, 'a')).toBeUndefined()
    expect(findSame(library, { title: 'Tutunamayanlar', authors: ['Oğuz Atay'] })).toBeUndefined()
  })
})

describe('displayTitle', () => {
  it('gives a title written all in capitals its capitals back, the Turkish way', () => {
    expect(displayTitle('SAATLERİ AYARLAMA ENSTİTÜSÜ')).toBe('Saatleri Ayarlama Enstitüsü')
    expect(displayTitle('BENİM ADIM KIRMIZI')).toBe('Benim Adım Kırmızı')
    expect(displayTitle('AŞK-I MEMNU')).toBe('Aşk-ı Memnu')
    expect(displayTitle('(TAM METİN) HUZUR')).toBe('(Tam Metin) Huzur')
  })

  it('keeps the small words small, except as the first word', () => {
    expect(displayTitle('SUÇ VE CEZA')).toBe('Suç ve Ceza')
    expect(displayTitle('VE SONRA')).toBe('Ve Sonra')
  })

  it('leaves alone a title that is not all capitals', () => {
    expect(displayTitle('Huzur')).toBe('Huzur')
    expect(displayTitle('iPhone ile Fotoğraf')).toBe('iPhone ile Fotoğraf')
    expect(displayTitle('1984')).toBe('1984')
  })

  it('lowers an I to i when told the title is not Turkish', () => {
    expect(displayTitle('THE SHINING', 'en')).toBe('The Shining')
  })
})
