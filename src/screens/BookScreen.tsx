import { Button } from 'kitshelf-ui/ui/Button.tsx'
import Chip from 'kitshelf-ui/ui/Chip.tsx'
import ConfirmDialog from 'kitshelf-ui/ui/ConfirmDialog.tsx'
import { CheckIcon, PlusIcon } from 'kitshelf-ui/ui/icons.tsx'
import Menu from 'kitshelf-ui/ui/Menu.tsx'
import Missing from 'kitshelf-ui/ui/Missing.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import { useToast } from 'kitshelf-ui/ui/toastContext.ts'
import { useId, useState } from 'react'
import { useBook } from '../app/appData.ts'
import { href, navigate } from '../app/router.ts'
import { pageDate, today } from '../books/dates.ts'
import { sortedNotes, tabOf } from '../books/library.ts'
import { addNote, editNote, filterNotes, removeNote, type NoteDraft, type NoteFilter } from '../books/notes.ts'
import { ACTIONS, applyAction, rateBook, type BookAction } from '../books/status.ts'
import { ACTION_LABELS, authorLine, KIND_LABELS, noteMeta, STATUS_LABELS } from '../books/texts.ts'
import type { BookNote, BookStatus } from '../books/types.ts'
import BookCover from '../ui/BookCover.tsx'
import FilterChips from '../ui/FilterChips.tsx'
import { BookOpenIcon, QuoteMark } from '../ui/icons.tsx'
import Stars from '../ui/Stars.tsx'
import styles from './BookScreen.module.css'
import NoteSheet from './NoteSheet.tsx'

const FILTERS: { value: NoteFilter; label: string }[] = [
  { value: 'all', label: 'Hepsi' },
  { value: 'note', label: 'Notlar' },
  { value: 'quote', label: 'Alıntılar' },
]

const EMPTY_FILTER: Record<NoteFilter, string> = {
  all: 'Okurken aklında kalanları, beğendiğin cümleleri buraya ekle.',
  note: 'Bu kitapta henüz not yok.',
  quote: 'Bu kitapta henüz alıntı yok.',
}

const STATUS_TONE: Record<BookStatus, 'accent' | 'neutral' | 'quiet'> = { want: 'neutral', reading: 'accent', read: 'accent', abandoned: 'quiet' }

export default function BookScreen({ bookId }: { bookId: string }) {
  const { book, saveBook, deleteBook } = useBook(bookId)
  const show = useToast()
  const ratingId = useId()
  const [filter, setFilter] = useState<NoteFilter>('all')
  // The note sheet: closed, open for a new note, or open on the note being changed.
  const [sheet, setSheet] = useState<{ open: boolean; note?: BookNote }>({ open: false })
  const [deleting, setDeleting] = useState(false)
  if (!book) return <Missing message="Bu kitap bulunamadı." back={href({ screen: 'home' })} />

  const now = today()
  const notes = filterNotes(sortedNotes(book), filter)
  const date = pageDate(book)
  const closeSheet = () => setSheet((current) => ({ ...current, open: false }))

  const act = (action: BookAction) => {
    saveBook(applyAction(book, action, today()))
    if (action === 'finish') show('Bitirdin. İstersen puan ver.')
  }

  const saveNote = (draft: NoteDraft) => {
    saveBook(sheet.note ? editNote(book, sheet.note.id, draft) : addNote(book, draft, crypto.randomUUID(), new Date()))
    if (!sheet.note) show('Not eklendi')
    closeSheet()
  }

  const deleteNote = () => {
    if (!sheet.note) return
    saveBook(removeNote(book, sheet.note.id))
    show('Not silindi')
    closeSheet()
  }

  const remove = () => {
    deleteBook(book.id)
    show('Kitap silindi')
    navigate({ screen: 'home' }, { replace: true })
  }

  return (
    <Screen
      title={book.title}
      mark={<BookCover book={book} size="page" />}
      subtitle={
        <span className={styles.meta}>
          {book.authors.length > 0 && <span className={styles.authors}>{authorLine(book)}</span>}
          <Chip tone={STATUS_TONE[book.status]} strong icon={book.status === 'reading' ? <BookOpenIcon /> : book.status === 'read' ? <CheckIcon size={14} strokeWidth={2.4} /> : undefined}>
            {STATUS_LABELS[book.status]}
          </Chip>
          {date && <span className={styles.date}>{date}</span>}
        </span>
      }
      // Back to the list this book is on, which is another one after "Bitirdim".
      back={href({ screen: 'home', tab: tabOf(book.status) })}
      aside={
        <Menu
          items={[
            { label: 'Düzenle', onSelect: () => navigate({ screen: 'book-edit', bookId }) },
            { label: 'Sil', danger: true, onSelect: () => setDeleting(true) },
          ]}
        />
      }
      footer={
        <Button variant="primary" big onClick={() => setSheet({ open: true })}>
          <PlusIcon size={20} strokeWidth={2.2} />
          Not ekle
        </Button>
      }
    >
      {ACTIONS[book.status].length > 0 && (
        <div className={styles.actions}>
          {ACTIONS[book.status].map((action) => (
            <Button key={action} variant={action === 'start' || action === 'finish' ? 'tonal' : 'secondary'} onClick={() => act(action)}>
              {action === 'finish' && <CheckIcon size={17} strokeWidth={2.4} />}
              {ACTION_LABELS[action]}
            </Button>
          ))}
        </div>
      )}

      <section className={styles.rating}>
        <div className={styles.ratingTop}>
          <h2 id={ratingId} className={styles.ratingTitle}>
            Puan
          </h2>
          {book.status !== 'read' && (
            <span id={`${ratingId}-hint`} className={styles.ratingHint}>
              Bitirince puan verebilirsin
            </span>
          )}
        </div>
        <Stars
          rating={book.rating}
          labelledBy={ratingId}
          describedBy={book.status !== 'read' ? `${ratingId}-hint` : undefined}
          disabled={book.status !== 'read'}
          onRate={(stars) => saveBook(rateBook(book, stars))}
        />
      </section>

      <div className={styles.notesTitle}>
        <h2>Notlar ve alıntılar</h2>
        {book.notes.length > 0 && <span className={styles.count}>{book.notes.length}</span>}
      </div>
      {book.notes.length > 0 && <FilterChips label="Göster" options={FILTERS} selected={filter} onSelect={setFilter} />}
      {notes.length === 0 ? (
        <p className={styles.empty}>{EMPTY_FILTER[book.notes.length === 0 ? 'all' : filter]}</p>
      ) : (
        <div className={styles.notes}>
          {notes.map((note) => (
            <button key={note.id} type="button" className={styles.note} aria-label={`${KIND_LABELS[note.kind]}, düzenle: ${note.text}`} onClick={() => setSheet({ open: true, note })}>
              <span className={styles.noteTop}>
                <Chip tone={note.kind === 'quote' ? 'accent' : 'neutral'} strong>
                  {KIND_LABELS[note.kind]}
                </Chip>
                <span>{noteMeta(note, now)}</span>
              </span>
              {note.kind === 'quote' ? (
                <span className={styles.quote}>
                  <QuoteMark />
                  <span>{note.text}</span>
                </span>
              ) : (
                <span className={styles.noteText}>{note.text}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <NoteSheet open={sheet.open} book={book} note={sheet.note} onSave={saveNote} onDelete={deleteNote} onClose={closeSheet} />

      <ConfirmDialog
        open={deleting}
        title={book.notes.length > 0 ? 'Bu kitap ve notları silinsin mi?' : 'Bu kitap silinsin mi?'}
        confirmLabel="Evet, sil"
        onConfirm={() => {
          setDeleting(false)
          remove()
        }}
        onCancel={() => setDeleting(false)}
      >
        {book.notes.length > 0 && `${book.notes.length} not ve alıntı da silinecek. `}Geri alınamaz.
      </ConfirmDialog>
    </Screen>
  )
}
