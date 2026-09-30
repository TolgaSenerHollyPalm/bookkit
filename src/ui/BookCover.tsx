import { useState, type CSSProperties } from 'react'
import { coverColor, coverTitleSize } from '../books/cover.ts'
import type { Book } from '../books/types.ts'
import styles from './BookCover.module.css'

interface BookCoverProps {
  book: Pick<Book, 'title' | 'authors'>
  size: 'row' | 'card' | 'page' // 40 × 60 in a search result, 64 × 96 in the library, 120 × 180 on the book's own page
  src?: string // the address of the cover picture, when there is one
}

// The title's type per size: the width is the cover less its padding, as BookCover.module.css sets it.
const TITLE = {
  row: { base: 6.5, width: 29, floor: 5, spacing: 0 },
  card: { base: 11, width: 49, floor: 8, spacing: -0.01 },
  page: { base: 20, width: 92, floor: 11, spacing: -0.02 },
}

/**
 * A book's cover: its picture over the cover the app draws (the title and first author on the colour the title
 * picks), so the drawn one shows while the picture loads and stays when it cannot be had.
 */
export default function BookCover({ book, size, src }: BookCoverProps) {
  const [failed, setFailed] = useState<string>()
  const look = { '--cover': coverColor(book.title), '--title-size': `${coverTitleSize(book.title, TITLE[size])}px` } as CSSProperties
  return (
    <span className={`${styles.cover} ${styles[size]}`} style={look} aria-hidden="true">
      <span className={styles.title}>{book.title}</span>
      {size !== 'row' && book.authors.length > 0 && <span className={styles.author}>{book.authors[0]}</span>}
      {src && failed !== src && <img className={styles.picture} src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(src)} />}
    </span>
  )
}
