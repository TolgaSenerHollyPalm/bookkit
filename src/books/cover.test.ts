import { describe, expect, it } from 'vitest'
import { COVER_COLORS, COVER_TEXT, coverColor } from './cover.ts'

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

describe('the colour of a drawn cover', () => {
  it('is the same for the same book, however its title is spelled', () => {
    expect(coverColor('Saatleri Ayarlama Enstitüsü')).toBe(coverColor('SAATLERİ  AYARLAMA ENSTİTÜSÜ'))
    expect(coverColor('Aşk-ı Memnu')).toBe(coverColor('ask i memnu'))
  })

  // Pinned: a change to the hash or to the list would recolour every shelf.
  it('stays what it was', () => {
    expect(['Anna Karenina', 'Saatleri Ayarlama Enstitüsü', 'Huzur', 'Beş Şehir', 'Tutunamayanlar', 'Suç ve Ceza', '1984'].map(coverColor)).toEqual([
      '#5A4A78',
      '#2F5D50',
      '#A0522D',
      '#2F5D50',
      '#8C5E1C',
      '#3E5C76',
      '#4F5B3A',
    ])
  })

  it('always comes from the list, and the cover text reads on every one at 5.1:1 or better', () => {
    expect(COVER_COLORS).toContain(coverColor(''))
    for (const color of COVER_COLORS) {
      const [lighter, darker] = [luminance(COVER_TEXT), luminance(color)].sort((a, b) => b - a)
      expect((lighter + 0.05) / (darker + 0.05), color).toBeGreaterThanOrEqual(5.1)
    }
  })
})
