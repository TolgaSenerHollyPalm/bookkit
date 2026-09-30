import { Button, LinkButton } from 'kitshelf-ui/ui/Button.tsx'
import Chip from 'kitshelf-ui/ui/Chip.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useToast } from 'kitshelf-ui/ui/toastContext.ts'
import { useOnline } from 'kitshelf-ui/ui/useOnline.ts'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useAppData } from '../app/appData.ts'
import { href } from '../app/router.ts'
import { parseIsbn } from '../books/isbn.ts'
import { newBook, type NewBook } from '../books/status.ts'
import { authorLine, STATUS_LABELS } from '../books/texts.ts'
import type { Book } from '../books/types.ts'
import { tidyGoogleBook, type GoogleBook } from '../search/googleBooks.ts'
import { inLibrary } from '../search/library.ts'
import type { FoundBook } from '../search/results.ts'
import { useBookSearch } from '../search/useBookSearch.ts'
import { useGoogleSearch } from '../search/useGoogleSearch.ts'
import BookCover from '../ui/BookCover.tsx'
import SearchField from '../ui/SearchField.tsx'
import styles from './SearchScreen.module.css'

const PLACES: { value: NewBook['status']; label: string }[] = [
  { value: 'want', label: STATUS_LABELS.want },
  { value: 'reading', label: STATUS_LABELS.reading },
  { value: 'read', label: STATUS_LABELS.read },
]

// Google's own graphic, from Google's own address: its terms want it beside every result it answers with.
const POWERED_BY_GOOGLE = 'https://books.google.com/googlebooks/images/poweredby.png'

/** What a row needs of a book, whichever source found it; `key` tells the two sources' rows apart. */
interface Row {
  key: string
  title: string
  authors: string[]
  coverUrl?: string
  link?: string
  owned: boolean
  add: (status: NewBook['status']) => Book
}

/** Adds books by looking them up: type, pick a result, say where it goes. The screen stays for the next book. */
export default function SearchScreen() {
  const { books, saveBook } = useAppData()
  const show = useToast()
  const online = useOnline()
  const id = useId()
  const [typed, setTyped] = useState('')
  const [chosenKey, setChosenKey] = useState<string>()
  const [status, setStatus] = useState<NewBook['status']>('want')
  const dismissToast = useRef<() => void>(undefined)
  const { query, state, retry } = useBookSearch(typed)
  const google = useGoogleSearch(query)

  const isbn = parseIsbn(query)
  // The form opens with what was searched for: a book that cannot be found should not have to be typed twice.
  const manual = href({ screen: 'add-manual', ...(isbn ? { isbn } : query ? { title: query } : {}) })

  const found = (state.phase === 'done' ? state.books : []).map((book) => openLibraryRow(book, books))
  const googled = (google.state?.phase === 'done' ? google.state.books : []).map((book) => googleRow(book, books, query))
  const chosen = [...found, ...googled].find((row) => row.key === chosenKey && !row.owned)
  // Google is asked once Open Library has had its say, and only by the reader: see useGoogleSearch.
  const canAskGoogle = google.offered && online && google.state === undefined && (state.phase === 'done' || state.phase === 'failed')

  const choose = (row: Row) => {
    // "Aç" is about the book before; left up, it would cover the button this choice brings.
    dismissToast.current?.()
    setChosenKey(row.key)
  }

  const add = () => {
    if (!chosen) return
    const book = chosen.add(status)
    saveBook(book)
    dismissToast.current = show(`${book.title} kitaplığa eklendi`, { duration: 6000, action: { label: 'Aç', to: href({ screen: 'book', bookId: book.id }) } })
    setChosenKey(undefined)
  }

  const rows = (list: Row[]) => list.map((row) => <ResultRow key={row.key} row={row} name={`${id}-found`} chosen={row.key === chosen?.key} onChoose={() => choose(row)} />)
  const googleButton = canAskGoogle && <Button onClick={google.ask}>Google Books’ta ara</Button>

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
                    <input type="radio" name={`${id}-place`} checked={status === value} onChange={() => setStatus(value)} />
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
        <SearchField label="Ara" placeholder="Kitap adı, yazar ya da ISBN" value={typed} onChange={setTyped} describedBy={`${id}-hint`} />
        <p id={`${id}-hint`} className={styles.hint}>
          Sonuçlar internetten geliyor; kapak ve bilgiler cihazına kaydedilir.
        </p>
      </div>

      {state.phase === 'loading' && <Skeleton>Aranıyor…</Skeleton>}
      {found.length > 0 && (
        <fieldset className={styles.results}>
          <legend className={text.visuallyHidden}>Sonuçlar</legend>
          {rows(found)}
        </fieldset>
      )}
      {state.phase === 'done' && found.length === 0 && (
        <Notice manual={manual} more={googleButton}>
          Sonuç yok. Yazımı kontrol et ya da kitabı elle ekle.
        </Notice>
      )}
      {state.phase === 'offline' && <Notice manual={manual}>İnternet yok. Kitabı elle ekleyebilirsin.</Notice>}
      {state.phase === 'failed' && (
        <Notice manual={manual} onRetry={retry} more={googleButton}>
          Arama yapılamadı. Tekrar dene ya da kitabı elle ekle.
        </Notice>
      )}

      {google.state && (
        <section className={styles.google}>
          <div className={styles.googleHead}>
            <h2 className={styles.googleTitle}>Google Books arama sonuçları</h2>
            <img className={styles.poweredBy} src={POWERED_BY_GOOGLE} alt="powered by Google" width={62} height={30} />
          </div>
          {google.state.phase === 'loading' && <Skeleton>Google Books’ta aranıyor…</Skeleton>}
          {googled.length > 0 && (
            <fieldset className={styles.results}>
              <legend className={text.visuallyHidden}>Google Books arama sonuçları</legend>
              {rows(googled)}
            </fieldset>
          )}
          {google.state.phase === 'done' && googled.length === 0 && <Notice manual={manual}>Google Books’ta da bulunamadı. Kitabı elle ekleyebilirsin.</Notice>}
          {google.state.phase === 'failed' &&
            (google.state.quotaUsedUp ? (
              <Notice manual={manual}>Google Books’un bugünkü arama hakkı doldu. Yarın tekrar dene ya da kitabı elle ekle.</Notice>
            ) : (
              <Notice manual={manual} onRetry={google.ask}>
                Google Books’a ulaşılamadı. Tekrar dene ya da kitabı elle ekle.
              </Notice>
            ))}
        </section>
      )}

      {/* Where a notice already offers the form, this line would only say it twice. */}
      {(state.phase === 'idle' || state.phase === 'loading' || found.length > 0 || googled.length > 0) && (
        <div className={styles.more}>
          <p className={styles.manual}>
            Bulamadın mı?
            <a className={styles.manualLink} href={manual}>
              Elle ekle
            </a>
          </p>
          {found.length > 0 && googleButton}
        </div>
      )}
    </Screen>
  )
}

function openLibraryRow(found: FoundBook, books: readonly Book[]): Row {
  const { id, title, authors, isbn, coverUrl } = found
  return {
    key: `openlibrary:${id}`,
    title,
    authors,
    coverUrl,
    owned: inLibrary(books, found) !== undefined,
    add: (status) => newBook({ id: crypto.randomUUID(), title, authors, isbn, status, coverUrl, source: { kind: 'openlibrary', id } }, new Date()),
  }
}

// Shown as Google wrote it; tidied only when it becomes the reader's own record.
function googleRow(book: GoogleBook, books: readonly Book[], query: string): Row {
  const { id, title, authors, isbn, coverUrl, link } = book
  return {
    key: `googlebooks:${id}`,
    title,
    authors,
    coverUrl,
    link,
    owned: inLibrary(books, { title, authors, isbn, isbns: isbn ? [isbn] : [] }) !== undefined,
    add: (status) => newBook({ id: crypto.randomUUID(), ...tidyGoogleBook(book, query), isbn, status, coverUrl, source: { kind: 'googlebooks', id } }, new Date()),
  }
}

function ResultRow({ row, name, chosen, onChoose }: { row: Row; name: string; chosen: boolean; onChoose: () => void }) {
  const body = (
    <>
      <BookCover book={row} size="row" src={row.coverUrl} />
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{row.title}</span>
        {row.authors.length > 0 && <span className={styles.rowAuthor}>{authorLine(row)}</span>}
        {row.link && (
          <a className={styles.rowLink} href={row.link} target="_blank" rel="noreferrer">
            Google Books’ta gör
          </a>
        )}
        {row.owned && (
          <span className={styles.rowOwned}>
            <Chip tone="quiet">Kitaplığında var</Chip>
          </span>
        )}
      </span>
    </>
  )
  if (row.owned) return <div className={`${styles.row} ${styles.owned}`}>{body}</div>
  return (
    <label className={chosen ? `${styles.row} ${styles.chosen}` : styles.row}>
      {body}
      <input className={styles.radio} type="radio" name={name} checked={chosen} onChange={onChoose} />
    </label>
  )
}

/** Three rows in the shape of results, so the screen does not jump when the real ones arrive. */
function Skeleton({ children }: { children: string }) {
  return (
    <div className={styles.results}>
      <p className={text.visuallyHidden} role="status">
        {children}
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

function Notice({ manual, onRetry, more, children }: { manual: string; onRetry?: () => void; more?: ReactNode; children: string }) {
  return (
    <div className={styles.notice}>
      <p role="status">{children}</p>
      <div className={styles.noticeActions}>
        {onRetry && <Button onClick={onRetry}>Tekrar dene</Button>}
        {more}
        <LinkButton to={manual}>Elle ekle</LinkButton>
      </div>
    </div>
  )
}
