import type { CSSProperties } from 'react'
import { coverColor, coverTitleSize } from '../books/cover.ts'
import type { Book } from '../books/types.ts'
import styles from './BookCover.module.css'

interface BookCoverProps {
  book: Pick<Book, 'title' | 'authors'>
  size: 'card' | 'page' // 64 × 96 in the library, 120 × 180 on the book's own page
}

// The title's type per size: the width is the cover less its padding, as BookCover.module.css sets it.
const TITLE = {
  card: { base: 11, width: 49, floor: 8, spacing: -0.01 },
  page: { base: 20, width: 92, floor: 11, spacing: -0.02 },
}

/** The cover the app draws for a book: its title and first author on the colour the title picks. */
export default function BookCover({ book, size }: BookCoverProps) {
  const look = { '--cover': coverColor(book.title), '--title-size': `${coverTitleSize(book.title, TITLE[size])}px` } as CSSProperties
  return (
    <span className={`${styles.cover} ${styles[size]}`} style={look} aria-hidden="true">
      <span className={styles.title}>{book.title}</span>
      {book.authors.length > 0 && <span className={styles.author}>{book.authors[0]}</span>}
    </span>
  )
}
