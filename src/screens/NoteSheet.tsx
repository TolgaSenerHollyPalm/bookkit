import { Button } from 'kitshelf-ui/ui/Button.tsx'
import Sheet from 'kitshelf-ui/ui/Sheet.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useId, useState } from 'react'
import { NOTE_MAX_LENGTH, parsePage, type NoteDraft } from '../books/notes.ts'
import { KIND_LABELS } from '../books/texts.ts'
import type { Book, BookNote } from '../books/types.ts'
import fields from '../ui/fields.module.css'
import styles from './NoteSheet.module.css'

interface NoteSheetProps {
  open: boolean
  book: Book
  note?: BookNote // the note being changed; without one the sheet adds a new note
  onSave: (draft: NoteDraft) => void
  onDelete: () => void
  onClose: () => void
}

/** Writes a note or a quote for a book, or changes one, in a panel over the book's page. */
export default function NoteSheet({ open, book, note, onSave, onDelete, onClose }: NoteSheetProps) {
  return (
    <Sheet open={open} title={note ? 'Notu düzenle' : 'Not ekle'} subtitle={book.title} onClose={onClose}>
      <NoteForm note={note} onSave={onSave} onDelete={onDelete} onClose={onClose} />
    </Sheet>
  )
}

const KINDS: BookNote['kind'][] = ['note', 'quote']

// Mounted by the sheet at every opening, so it always starts from the note it was given.
function NoteForm({ note, onSave, onDelete, onClose }: Omit<NoteSheetProps, 'open' | 'book'>) {
  const id = useId()
  const [kind, setKind] = useState<BookNote['kind']>(note?.kind ?? 'note')
  const [words, setWords] = useState(note?.text ?? '')
  const [pageText, setPageText] = useState(note?.page === undefined ? '' : String(note.page))
  const { page, problem } = parsePage(pageText)

  return (
    <form
      className={fields.form}
      onSubmit={(event) => {
        event.preventDefault()
        if (words.trim() !== '' && !problem) onSave({ kind, text: words, page })
      }}
    >
      <fieldset className={styles.kinds}>
        <legend className={text.visuallyHidden}>Tür</legend>
        {KINDS.map((value) => (
          <label key={value} className={styles.kind}>
            <input type="radio" name={`${id}-kind`} checked={kind === value} onChange={() => setKind(value)} />
            <span>{KIND_LABELS[value]}</span>
          </label>
        ))}
      </fieldset>

      <label className={fields.field}>
        <span className={text.visuallyHidden}>{KIND_LABELS[kind]}</span>
        {/* The real attribute, not React's autoFocus: the dialog looks for it when it opens. */}
        <textarea
          ref={(element) => element?.setAttribute('autofocus', '')}
          className={fields.textarea}
          value={words}
          maxLength={NOTE_MAX_LENGTH}
          onChange={(event) => setWords(event.target.value)}
        />
      </label>

      <div className={fields.field}>
        <label className={fields.label} htmlFor={`${id}-page`}>
          Sayfa <span className={fields.optional}>(isteğe bağlı)</span>
        </label>
        <input
          id={`${id}-page`}
          className={`${fields.input} ${fields.short}`}
          inputMode="numeric"
          autoComplete="off"
          value={pageText}
          aria-invalid={problem !== undefined}
          aria-describedby={problem ? `${id}-problem` : undefined}
          onChange={(event) => setPageText(event.target.value)}
        />
        {problem && (
          <p id={`${id}-problem`} className={text.problem}>
            {problem}
          </p>
        )}
      </div>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={words.trim() === '' || problem !== undefined}>
          Kaydet
        </Button>
        <Button variant="text" onClick={onClose}>
          Vazgeç
        </Button>
        {note && (
          <button type="button" className={styles.remove} onClick={onDelete}>
            Notu sil
          </button>
        )}
      </div>
    </form>
  )
}
