import { Button, LinkButton } from 'kitshelf-ui/ui/Button.tsx'
import Chip from 'kitshelf-ui/ui/Chip.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useToast } from 'kitshelf-ui/ui/toastContext.ts'
import { useId, useRef, useState } from 'react'
import { useAppData } from '../app/appData.ts'
import { href } from '../app/router.ts'
import { parseIsbn } from '../books/isbn.ts'
import { newBook, type NewBook } from '../books/status.ts'
import { authorLine, STATUS_LABELS } from '../books/texts.ts'
import { inLibrary } from '../search/library.ts'
import type { FoundBook } from '../search/results.ts'
import { useBookSearch } from '../search/useBookSearch.ts'
import BookCover from '../ui/BookCover.tsx'
import SearchField from '../ui/SearchField.tsx'
import styles from './SearchScreen.module.css'

const PLACES: { value: NewBook['status']; label: string }[] = [
  { value: 'want', label: STATUS_LABELS.want },
  { value: 'reading', label: STATUS_LABELS.reading },
  { value: 'read', label: STATUS_LABELS.read },
]

/** Adds books by looking them up: type, pick a result, say where it goes. The screen stays for the next book. */
export default function SearchScreen() {
  const { books, saveBook } = useAppData()
  const show = useToast()
  const hintId = useId()
  const [typed, setTyped] = useState('')
  const [chosenId, setChosenId] = useState<string>()
  const [status, setStatus] = useState<NewBook['status']>('want')
  const dismissToast = useRef<() => void>(undefined)
  const { query, state, retry } = useBookSearch(typed)

  const found = state.phase === 'done' ? state.books : []
  const chosen = found.find((book) => book.id === chosenId && !inLibrary(books, book))
  const isbn = parseIsbn(query)
  // The form opens with what was searched for: a book that cannot be found should not have to be typed twice.
  const manual = href({ screen: 'add-manual', ...(isbn ? { isbn } : query ? { title: query } : {}) })

  const choose = (book: FoundBook) => {
    // "Aç" is about the book before; left up, it would cover the button this choice brings.
    dismissToast.current?.()
    setChosenId(book.id)
  }

  const add = () => {
    if (!chosen) return
    const book = newBook(
      { id: crypto.randomUUID(), title: chosen.title, authors: chosen.authors, isbn: chosen.isbn, status, coverUrl: chosen.coverUrl, source: { kind: 'openlibrary', id: chosen.id } },
      new Date(),
    )
    saveBook(book)
    dismissToast.current = show(`${book.title} kitaplığa eklendi`, { duration: 6000, action: { label: 'Aç', to: href({ screen: 'book', bookId: book.id }) } })
    setChosenId(undefined)
  }

  return (
    <Screen
      title="Kitap ekle"
      back={href({ screen: 'home' })}
      footer={
        chosen && (
          <div className={styles.dock}>
            {/* Down here rather than under the list: twenty rows would push it out of sight of the book being chosen. */}
            <fieldset className={styles.places}>
              <legend className={styles.placesLegend}>Nereye eklensin?</legend>
              <div className={styles.placeRow}>
                {PLACES.map(({ value, label }) => (
                  <label key={value} className={styles.place}>
                    <input type="radio" name={`${hintId}-place`} checked={status === value} onChange={() => setStatus(value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button variant="primary" big onClick={add}>
              Kitaplığa ekle
            </Button>
          </div>
        )
      }
    >
      <div className={styles.search}>
        <SearchField label="Ara" placeholder="Kitap adı, yazar ya da ISBN" value={typed} onChange={setTyped} describedBy={hintId} />
        <p id={hintId} className={styles.hint}>
          Sonuçlar internetten geliyor; kapak ve bilgiler cihazına kaydedilir.
        </p>
      </div>

      {state.phase === 'loading' && <Skeleton />}

      {found.length > 0 && (
        <fieldset className={styles.results}>
          <legend className={text.visuallyHidden}>Sonuçlar</legend>
          {found.map((book) => (
            <ResultRow key={book.id} book={book} owned={inLibrary(books, book) !== undefined} chosen={book.id === chosen?.id} onChoose={() => choose(book)} />
          ))}
        </fieldset>
      )}

      {state.phase === 'done' && found.length === 0 && <Notice manual={manual}>Sonuç yok. Yazımı kontrol et ya da kitabı elle ekle.</Notice>}
      {state.phase === 'offline' && <Notice manual={manual}>İnternet yok. Kitabı elle ekleyebilirsin.</Notice>}
      {state.phase === 'failed' && (
        <Notice manual={manual} onRetry={retry}>
          Arama yapılamadı. Tekrar dene ya da kitabı elle ekle.
        </Notice>
      )}

      {/* Where a notice already offers the form, this line would only say it twice. */}
      {(state.phase === 'idle' || state.phase === 'loading' || found.length > 0) && (
        <p className={styles.manual}>
          Bulamadın mı?
          <a className={styles.manualLink} href={manual}>
            Elle ekle
          </a>
        </p>
      )}
    </Screen>
  )
}

function ResultRow({ book, owned, chosen, onChoose }: { book: FoundBook; owned: boolean; chosen: boolean; onChoose: () => void }) {
  const body = (
    <>
      <BookCover book={book} size="row" src={book.coverUrl} />
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{book.title}</span>
        {book.authors.length > 0 && <span className={styles.rowAuthor}>{authorLine(book)}</span>}
        {owned && (
          <span className={styles.rowOwned}>
            <Chip tone="quiet">Kitaplığında var</Chip>
          </span>
        )}
      </span>
    </>
  )
  if (owned) return <div className={`${styles.row} ${styles.owned}`}>{body}</div>
  return (
    <label className={chosen ? `${styles.row} ${styles.chosen}` : styles.row}>
      {body}
      <input className={styles.radio} type="radio" name="found-book" checked={chosen} onChange={onChoose} />
    </label>
  )
}

/** Three rows in the shape of results, so the screen does not jump when the real ones arrive. */
function Skeleton() {
  return (
    <div className={styles.results}>
      <p className={text.visuallyHidden} role="status">
        Aranıyor…
      </p>
      {[0, 1, 2].map((row) => (
        <div key={row} className={`${styles.row} ${styles.skeleton}`} aria-hidden="true">
          <span className={styles.skeletonCover} />
          <span className={styles.rowBody}>
            <span className={styles.skeletonLine} />
            <span className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
          </span>
        </div>
      ))}
    </div>
  )
}

function Notice({ manual, onRetry, children }: { manual: string; onRetry?: () => void; children: string }) {
  return (
    <div className={styles.notice}>
      <p role="status">{children}</p>
      <div className={styles.noticeActions}>
        {onRetry && <Button onClick={onRetry}>Tekrar dene</Button>}
        <LinkButton to={manual}>Elle ekle</LinkButton>
      </div>
    </div>
  )
}
