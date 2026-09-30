import { describe, expect, it } from 'vitest'
import { addNote, editNote, filterNotes, parsePage, removeNote } from './notes.ts'
import { book, note } from './test-helpers.ts'

describe('the page of a note', () => {
  it('may be left empty', () => {
    expect(parsePage('')).toEqual({})
    expect(parsePage('  ')).toEqual({})
  })

  it('is a whole number from 1 to 9999', () => {
    expect(parsePage('1')).toEqual({ page: 1 })
    expect(parsePage(' 734 ')).toEqual({ page: 734 })
    expect(parsePage('9999')).toEqual({ page: 9999 })
    for (const wrong of ['0', '10000', '12a', '-3', '1,5', '1.5']) expect(parsePage(wrong)).toEqual({ problem: 'Sayfa 1 ile 9999 arasında olmalı.' })
  })
})

describe('notes of a book', () => {
  const now = new Date('2026-09-26T18:00:00.000Z')

  it('are added at the end, trimmed, with the moment they were written', () => {
    const changed = addNote(book(), { kind: 'quote', text: '  Mutlu ailelerin hepsi birbirine benzer.  ', page: 1 }, 'q1', now)
    expect(changed.notes).toEqual([{ id: 'q1', kind: 'quote', text: 'Mutlu ailelerin hepsi birbirine benzer.', page: 1, createdAt: now.toISOString() }])
    expect('page' in addNote(book(), { kind: 'note', text: 'Sayfasız' }, 'n1', now).notes[0]).toBe(false)
  })

  it('are changed in place and keep their day', () => {
    const with2 = book({ notes: [note('n1', '2026-09-12T10:00:00.000Z', { page: 12 }), note('n2', '2026-09-19T10:00:00.000Z')] })
    const changed = editNote(with2, 'n1', { kind: 'quote', text: 'Yeni metin' })
    expect(changed.notes[0]).toEqual({ id: 'n1', kind: 'quote', text: 'Yeni metin', createdAt: '2026-09-12T10:00:00.000Z' })
    expect(changed.notes[1]).toBe(with2.notes[1])
  })

  it('are removed one by one', () => {
    const with2 = book({ notes: [note('n1', '2026-09-12T10:00:00.000Z'), note('n2', '2026-09-19T10:00:00.000Z')] })
    expect(removeNote(with2, 'n1').notes.map((n) => n.id)).toEqual(['n2'])
  })

  it('are shown all together, or only the notes, or only the quotes', () => {
    const notes = [note('n1', 'a'), note('q1', 'b', { kind: 'quote' }), note('n2', 'c')]
    expect(filterNotes(notes, 'all')).toHaveLength(3)
    expect(filterNotes(notes, 'note').map((n) => n.id)).toEqual(['n1', 'n2'])
    expect(filterNotes(notes, 'quote').map((n) => n.id)).toEqual(['q1'])
  })
})
