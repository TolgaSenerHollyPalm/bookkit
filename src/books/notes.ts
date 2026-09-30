import type { Book, BookNote } from './types.ts'

export const NOTE_MAX_LENGTH = 5000

/** What the note sheet hands over: the words as typed, and the page as a number when one was given. */
export interface NoteDraft {
  kind: BookNote['kind']
  text: string
  page?: number
}

/** The page field of the note sheet: empty is fine, otherwise a whole number from 1 to 9999. */
export function parsePage(text: string): { page?: number; problem?: string } {
  const trimmed = text.trim()
  if (trimmed === '') return {}
  const page = Number(trimmed)
  if (!/^\d+$/.test(trimmed) || page < 1 || page > 9999) return { problem: 'Sayfa 1 ile 9999 arasında olmalı.' }
  return { page }
}

const made = (draft: NoteDraft, id: string, createdAt: string): BookNote => ({
  id,
  kind: draft.kind,
  text: draft.text.trim(),
  ...(draft.page !== undefined && { page: draft.page }),
  createdAt,
})

export function addNote(book: Book, draft: NoteDraft, id: string, now: Date): Book {
  return { ...book, notes: [...book.notes, made(draft, id, now.toISOString())] }
}

/** Changes a note in place; it keeps the day it was written. */
export function editNote(book: Book, noteId: string, draft: NoteDraft): Book {
  return { ...book, notes: book.notes.map((note) => (note.id === noteId ? made(draft, note.id, note.createdAt) : note)) }
}

export function removeNote(book: Book, noteId: string): Book {
  return { ...book, notes: book.notes.filter((note) => note.id !== noteId) }
}

export type NoteFilter = 'all' | BookNote['kind']

export const filterNotes = (notes: readonly BookNote[], filter: NoteFilter): BookNote[] =>
  notes.filter((note) => filter === 'all' || note.kind === filter)
