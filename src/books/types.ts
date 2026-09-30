export type BookStatus = 'want' | 'reading' | 'read' | 'abandoned'

/** A local calendar day, YYYY-MM-DD. */
export type Day = string

export type Rating = 1 | 2 | 3 | 4 | 5

export interface BookNote {
  id: string
  kind: 'note' | 'quote'
  text: string
  page?: number // 1–9999
  createdAt: string // ISO
}

export interface Book {
  id: string
  title: string
  authors: string[] // may be empty
  isbn?: string // ISBN-13, digits only
  status: BookStatus
  startedAt?: Day
  finishedAt?: Day // the day it was finished, or given up for 'abandoned'
  rating?: Rating // only while 'read'
  coverUrl?: string // where the cover came from, to fetch it again after a restore
  source?: { kind: 'openlibrary' | 'googlebooks' | 'manual'; id?: string }
  notes: BookNote[] // kept inside the book, so a backup merges book by book
  createdAt: string // ISO
  updatedAt: string // ISO, stamped on every save
}
