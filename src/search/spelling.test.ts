import { describe, expect, it } from 'vitest'
import { accents, bestSpelled, commonLatinName, fixCaps, hasTurkishLetters, isBroken, isLatin, isPlainLatinName, respell, tidyName, tidyTitle, turkishTitle } from './spelling.ts'

describe('isBroken', () => {
  it('spots text that was decoded wrongly on its way into the catalogue', () => {
    expect(isBroken('Saatleri Ayarlama Enstitï¿½sï¿½')).toBe(true)
    expect(isBroken('Saatleri Ayarlama Enstit�s�')).toBe(true)
    expect(isBroken('Saatleri Ayarlama Enstitüsü')).toBe(false)
  })
})

describe('bestSpelled', () => {
  it('counts the letters beyond ASCII', () => {
    expect(accents('Beyaz Dis')).toBe(0)
    expect(accents('Beyaz Diş')).toBe(1)
    expect(accents('Kırmızı Saçlı Kadın')).toBe(6)
    expect(accents('1984 – Ölüm!')).toBe(2)
  })

  it('takes the spelling that kept the most of its letters, and the earliest of equals', () => {
    expect(bestSpelled(['Beyaz Dis', 'Beyaz Diş', 'Beyaz Dis'])).toBe('Beyaz Diş')
    expect(bestSpelled(['Kirmizi saçli kadin', 'Kırmızı Saçlı Kadın'])).toBe('Kırmızı Saçlı Kadın')
    expect(bestSpelled(['Suç ve Ceza', 'Suç Ve Ceza'])).toBe('Suç ve Ceza')
  })
})

describe('fixCaps', () => {
  it('gives a Turkish text written all in capitals its small letters back, the Turkish way', () => {
    expect(fixCaps('AHMET HAMDİ TANPINAR', true)).toBe('Ahmet Hamdi Tanpınar')
    expect(fixCaps('BENİM ADIM KIRMIZI', true)).toBe('Benim Adım Kırmızı')
    expect(fixCaps('AŞK-I MEMNU', true)).toBe('Aşk-ı Memnu')
    expect(fixCaps('(TAM METİN) HUZUR', true)).toBe('(Tam Metin) Huzur')
  })

  it('reads the I of a Turkish text typed in ASCII as an i', () => {
    expect(fixCaps('AHMET HAMDI TANPINAR', true)).toBe('Ahmet Hamdi Tanpinar')
  })

  it('does not lower another language by the Turkish rule', () => {
    expect(fixCaps('THE SHINING', false)).toBe('The Shining')
    expect(fixCaps('FÜNF WOCHEN IM BALLON', false)).toBe('Fünf Wochen Im Ballon')
  })

  it('keeps the capitals of initials', () => {
    expect(fixCaps('J.R.R. TOLKIEN', false)).toBe('J.R.R. Tolkien')
  })

  it('leaves alone a text that is not all in capitals, or has no letters', () => {
    expect(fixCaps('Huzur', true)).toBe('Huzur')
    expect(fixCaps('iPhone ile Fotoğraf', true)).toBe('iPhone ile Fotoğraf')
    expect(fixCaps('1984', true)).toBe('1984')
    expect(fixCaps('מוזיאון התמימות', false)).toBe('מוזיאון התמימות')
  })
})

describe('turkishTitle', () => {
  it('gives every word its capital', () => {
    expect(turkishTitle('Saatleri ayarlama enstitüsü')).toBe('Saatleri Ayarlama Enstitüsü')
    expect(turkishTitle('Günlüklerin ışığında Tanpınar’la başbaşa')).toBe('Günlüklerin Işığında Tanpınar’la Başbaşa')
    expect(turkishTitle('istanbul hatırası')).toBe('İstanbul Hatırası')
    expect(turkishTitle('(tam metin) huzur')).toBe('(Tam Metin) Huzur')
  })

  it('keeps the small words small, except as the first word', () => {
    expect(turkishTitle('Suç Ve Ceza')).toBe('Suç ve Ceza')
    expect(turkishTitle('Ve sonra')).toBe('Ve Sonra')
    expect(turkishTitle('Kimse Yok Mu?')).toBe('Kimse Yok mu?')
    expect(turkishTitle('Ya hep ya hiç')).toBe('Ya Hep ya Hiç')
  })

  it('leaves alone a word with a capital inside, and a number', () => {
    expect(turkishTitle('iPhone ile fotoğraf')).toBe('iPhone ile Fotoğraf')
    expect(turkishTitle('Savaş ve barış, cilt 2')).toBe('Savaş ve Barış, Cilt 2')
    expect(turkishTitle('1984')).toBe('1984')
  })

  it('capitalises a title typed without Turkish letters the plain way', () => {
    expect(turkishTitle('Kuyucakli yusuf')).toBe('Kuyucakli Yusuf')
    expect(turkishTitle('ince memed')).toBe('Ince Memed')
  })
})

describe('tidyTitle and tidyName', () => {
  it('takes a catalogue’s trailing marks and spare spaces off a title', () => {
    expect(tidyTitle('Yaban.')).toBe('Yaban')
    expect(tidyTitle('Huzur /')).toBe('Huzur')
    expect(tidyTitle('  Beş   şehir. ')).toBe('Beş şehir')
    expect(tidyTitle('Kuran-ı  Kerim :')).toBe('Kuran-ı Kerim')
  })

  it('keeps an ellipsis, and the marks inside a title', () => {
    expect(tidyTitle('Ve sonra...')).toBe('Ve sonra...')
    expect(tidyTitle('Kürk Mantolu Madonna ; Özel Baskı')).toBe('Kürk Mantolu Madonna ; Özel Baskı')
  })

  it('takes the mark a catalogue left after a name, not the full stop of an initial', () => {
    expect(tidyName('Rafael Carpintero;')).toBe('Rafael Carpintero')
    expect(tidyName(' Orhan  Pamuk, ')).toBe('Orhan Pamuk')
    expect(tidyName('Yılmaz Ö.')).toBe('Yılmaz Ö.')
  })
})

describe('respell', () => {
  it('spells a word as the reader typed it when that has more of its Turkish letters', () => {
    expect(respell('Beyaz Dis', 'beyaz diş')).toBe('Beyaz Diş')
    expect(respell('Ask-i Memnu', 'aşk-ı memnu')).toBe('Aşk-ı Memnu')
    expect(respell('Dönüsüm', 'DÖNÜŞÜM')).toBe('Dönüşüm')
    expect(respell('Ahmet Hamdi Tanpinar', 'tanpınar huzur')).toBe('Ahmet Hamdi Tanpınar')
  })

  it('keeps the capitals where the text had them, the Turkish way', () => {
    expect(respell('Istanbul Hatirasi', 'istanbul hatırası')).toBe('Istanbul Hatırası')
    expect(respell('ISTANBUL', 'İstanbul')).toBe('İSTANBUL')
  })

  it('leaves the text alone when what was typed has no more letters than it', () => {
    expect(respell('Beyaz Diş', 'beyaz dis')).toBe('Beyaz Diş')
    expect(respell('Suç ve Ceza', 'suc ve ceza')).toBe('Suç ve Ceza')
    expect(respell('Huzur', 'tanpınar')).toBe('Huzur')
  })
})

describe('names in Latin letters', () => {
  it('tells a name a Turkish reader can read', () => {
    expect(isLatin('Лев Толстой')).toBe(false)
    expect(isLatin('村上春樹')).toBe(false)
    expect(isLatin('Oğuz Atay')).toBe(true)
  })

  it('tells a full name written plainly', () => {
    expect(isPlainLatinName('Fyodor Dostoyevsky')).toBe(true)
    expect(isPlainLatinName('Antoine de Saint-Exupéry')).toBe(true)
    expect(isPlainLatinName('F. M. Dostoevskij')).toBe(false)
    expect(isPlainLatinName('Dostoyevsky, Fyodor')).toBe(false)
    expect(isPlainLatinName('MURAKAMI Haruki')).toBe(false)
    expect(isPlainLatinName('Dostoyevsky')).toBe(false)
    expect(isPlainLatinName('Достоевский Фёдор')).toBe(false)
  })

  const names = ['F. M. Dostoevskij', 'Fedor Dostoyevsky', 'Fyodor Mikhailovich Dostoyevsky', 'Dostoyevsky, Fyodor', 'FEDOR DOSTOYEVSKY', 'Fyodor Dostoevsky', 'Fyodor Dostoyevsky', 'Достоевский']

  it('picks the plain name made of the words most of the others agree on', () => {
    expect(commonLatinName(names)).toBe('Fyodor Dostoyevsky')
  })

  it('picks the same name whatever order the catalogue lists them in', () => {
    expect(commonLatinName([...names].reverse())).toBe('Fyodor Dostoyevsky')
    expect(commonLatinName(['Murakami Haruki', 'Haruki Murakami'])).toBe(commonLatinName(['Haruki Murakami', 'Murakami Haruki']))
  })

  it('has nothing to offer when no other name is a plain Latin one', () => {
    expect(commonLatinName(['אברהם ב. יהושע', 'A. B. Yehoshua'])).toBeUndefined()
    expect(commonLatinName([])).toBeUndefined()
  })
})

describe('hasTurkishLetters', () => {
  it('goes by the letters Turkish shares with hardly any other language', () => {
    expect(hasTurkishLetters('Beyaz Diş')).toBe(true)
    expect(hasTurkishLetters('Kırmızı')).toBe(true)
    expect(hasTurkishLetters('Fünf Wochen')).toBe(false)
    expect(hasTurkishLetters('Beyaz Dis')).toBe(false)
  })
})
