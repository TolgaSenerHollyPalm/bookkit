import { LinkButton } from 'kitshelf-ui/ui/Button.tsx'
import Chip from 'kitshelf-ui/ui/Chip.tsx'
import { IconLink } from 'kitshelf-ui/ui/IconButton.tsx'
import { ChevronRightIcon, PlusIcon, SlidersIcon } from 'kitshelf-ui/ui/icons.tsx'
import IosInstallHint from 'kitshelf-ui/ui/IosInstallHint.tsx'
import OnlineBadge from 'kitshelf-ui/ui/OnlineBadge.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useId } from 'react'
import { useAppData } from '../app/appData.ts'
import { href, navigate } from '../app/router.ts'
import { today } from '../books/dates.ts'
import { booksOfTab, finishedThisYear, initialTab, latestNote, tabCounts, type Tab } from '../books/library.ts'
import { authorLine, cardInfo, EMPTY_TAB, KIND_LABELS, noteMeta, STATUS_LABELS, TAB_LABELS } from '../books/texts.ts'
import type { Book, Day } from '../books/types.ts'
import { KEYS, KIT_NAME } from '../kit.ts'
import BookCover from '../ui/BookCover.tsx'
import LibraryTabs from '../ui/LibraryTabs.tsx'
import { SmallRating } from '../ui/Stars.tsx'
import styles from './HomeScreen.module.css'

/** The library: three lists of books, and the newest note under them. */
export default function HomeScreen({ tab }: { tab?: Tab }) {
  const { books, covers } = useAppData()
  const panelId = useId()
  const now = today()
  const selected = tab ?? initialTab(books)
  const shown = booksOfTab(books, selected)
  const finished = finishedThisYear(books, now)
  const last = latestNote(books)

  return (
    <Screen
      title="Kitaplığın"
      eyebrow={finished > 0 && `Bu yıl ${finished} kitap bitirdin`}
      icon={
        <span className={styles.brand}>
          {/* The app icon itself, so the mark beside the name changes with public/favicon.svg. */}
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={32} height={32} />
          {KIT_NAME}
        </span>
      }
      aside={
        <>
          <OnlineBadge />
          <IconLink to={href({ screen: 'settings' })} label="Ayarlar">
            <SlidersIcon />
          </IconLink>
        </>
      }
      footer={
        <LinkButton to={href({ screen: 'add' })} variant="primary" big>
          <PlusIcon size={20} strokeWidth={2.2} />
          Kitap ekle
        </LinkButton>
      }
    >
      <IosInstallHint dismissedKey={KEYS.installHintDismissed} />

      {/* An empty app should say what it is for before it asks for anything. */}
      {books.length === 0 ? (
        <section className={styles.welcome}>
          <h2 className={styles.welcomeTitle}>Kitaplığın burada birikecek</h2>
          <p className={text.hint}>
            Okuduğun, okumak istediğin ve bitirdiğin kitapları ekle. Okurken aldığın notlar ve alıntılar kitabın
            sayfasında durur.
          </p>
        </section>
      ) : (
        <>
          {/* The address names the tab; replacing it keeps the back button from walking through tabs. */}
          <LibraryTabs
            counts={tabCounts(books)}
            selected={selected}
            onSelect={(next) => navigate({ screen: 'home', tab: next }, { replace: true })}
            panelId={panelId}
          />
          <div id={panelId} className={styles.books} role="tabpanel" aria-label={TAB_LABELS[selected]}>
            {shown.length === 0 ? <p className={styles.empty}>{EMPTY_TAB[selected]}</p> : shown.map((book) => <BookCard key={book.id} book={book} cover={covers.get(book.id)} today={now} />)}
          </div>

          {last && (
            <section className={styles.section}>
              <h2 className={text.sectionTitle}>Son notun</h2>
              <a className={styles.lastNote} href={href({ screen: 'book', bookId: last.book.id })}>
                <span className={styles.lastMeta}>
                  <Chip tone={last.note.kind === 'quote' ? 'accent' : 'neutral'} strong>
                    {KIND_LABELS[last.note.kind]}
                  </Chip>
                  <span>
                    {last.book.title} · {noteMeta(last.note, now)}
                  </span>
                </span>
                <span className={styles.lastText}>{last.note.text}</span>
              </a>
            </section>
          )}
        </>
      )}
    </Screen>
  )
}

function BookCard({ book, cover, today: now }: { book: Book; cover?: string; today: Day }) {
  return (
    <a className={styles.card} href={href({ screen: 'book', bookId: book.id })}>
      <BookCover book={book} size="card" src={cover} />
      <span className={styles.cardBody}>
        <span className={styles.cardTitle}>{book.title}</span>
        {book.authors.length > 0 && <span className={styles.cardAuthor}>{authorLine(book)}</span>}
        <span className={styles.cardInfo}>
          {book.status === 'abandoned' && <Chip tone="quiet">{STATUS_LABELS.abandoned}</Chip>}
          <span>{cardInfo(book, now)}</span>
          {book.status === 'read' && book.rating !== undefined && <SmallRating rating={book.rating} />}
        </span>
      </span>
      <span className={styles.chevron}>
        <ChevronRightIcon />
      </span>
    </a>
  )
}
