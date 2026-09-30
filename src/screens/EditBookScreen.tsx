import { Button } from 'kitshelf-ui/ui/Button.tsx'
import ChoiceGroup from 'kitshelf-ui/ui/ChoiceGroup.tsx'
import ConfirmDialog from 'kitshelf-ui/ui/ConfirmDialog.tsx'
import Missing from 'kitshelf-ui/ui/Missing.tsx'
import RequiredMark from 'kitshelf-ui/ui/RequiredMark.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useId, useState } from 'react'
import { useBook } from '../app/appData.ts'
import { href, navigate } from '../app/router.ts'
import { today } from '../books/dates.ts'
import { parseAuthors, readIsbnField } from '../books/form.ts'
import { findSame } from '../books/match.ts'
import { changeStatus, dateProblems, tidyBook } from '../books/status.ts'
import { authorLine, STATUS_LABELS } from '../books/texts.ts'
import type { Book, BookStatus } from '../books/types.ts'
import fields from '../ui/fields.module.css'

const STATES: { value: BookStatus; label: string }[] = (['want', 'reading', 'read', 'abandoned'] as const).map((value) => ({ value, label: STATUS_LABELS[value] }))

export default function EditBookScreen({ bookId }: { bookId: string }) {
  const { book, books, saveBook } = useBook(bookId)
  if (!book) return <Missing message="Bu kitap bulunamadı." back={href({ screen: 'home' })} />
  return <EditForm book={book} books={books} saveBook={saveBook} />
}

function EditForm({ book, books, saveBook }: { book: Book; books: Book[]; saveBook: (book: Book) => void }) {
  const id = useId()
  // The state and the dates live in a copy of the book, so picking a state moves them as the rules say.
  const [draft, setDraft] = useState(book)
  const [title, setTitle] = useState(book.title)
  const [authors, setAuthors] = useState(authorLine(book))
  const [isbnText, setIsbnText] = useState(book.isbn ?? '')
  const [tried, setTried] = useState(false)
  const [warned, setWarned] = useState(false)
  const [restarting, setRestarting] = useState(false)

  const now = today()
  const { isbn, problem: isbnProblem } = readIsbnField(isbnText)
  const dates = dateProblems(draft, now)
  const candidate = { title: title.trim(), authors: parseAuthors(authors), isbn }
  const back = href({ screen: 'book', bookId: book.id })

  const pick = (status: BookStatus) => {
    // A finished book going back to "Okuyorum" loses its finishing day and its rating: ask first.
    if (draft.status === 'read' && status === 'reading') setRestarting(true)
    else setDraft(changeStatus(draft, status, today()))
  }

  const setDay = (key: 'startedAt' | 'finishedAt', value: string) => {
    const next = { ...draft }
    if (value) next[key] = value
    else delete next[key]
    setDraft(next)
  }

  const submit = () => {
    setTried(true)
    if (candidate.title === '' || isbnProblem || dates.length > 0) return
    if (!warned && findSame(books, candidate, book.id)) {
      setWarned(true)
      return
    }
    const next: Book = { ...draft, title: candidate.title, authors: candidate.authors }
    if (isbn) next.isbn = isbn
    else delete next.isbn
    saveBook(tidyBook(next))
    navigate({ screen: 'book', bookId: book.id }, { replace: true })
  }

  const typed = (set: (value: string) => void) => (value: string) => {
    set(value)
    setWarned(false)
  }

  return (
    <Screen
      title="Kitabı düzenle"
      back={back}
      footer={
        <Button variant="primary" big disabled={candidate.title === ''} onClick={submit}>
          {warned ? 'Yine de kaydet' : 'Kaydet'}
        </Button>
      }
    >
      <div className={fields.form}>
        <div className={fields.field}>
          <label className={fields.label} htmlFor={`${id}-title`}>
            Kitabın adı
            <RequiredMark />
          </label>
          <input id={`${id}-title`} className={fields.input} value={title} maxLength={200} autoComplete="off" onChange={(event) => typed(setTitle)(event.target.value)} />
        </div>

        <div className={fields.field}>
          <label className={fields.label} htmlFor={`${id}-authors`}>
            Yazar
          </label>
          <input
            id={`${id}-authors`}
            className={fields.input}
            value={authors}
            maxLength={200}
            autoComplete="off"
            aria-describedby={`${id}-authors-hint`}
            onChange={(event) => typed(setAuthors)(event.target.value)}
          />
          <p id={`${id}-authors-hint`} className={fields.hint}>
            Birden fazla yazarı virgülle ayır
          </p>
        </div>

        <div className={fields.field}>
          <label className={fields.label} htmlFor={`${id}-isbn`}>
            ISBN <span className={fields.optional}>(isteğe bağlı)</span>
          </label>
          <input
            id={`${id}-isbn`}
            className={fields.input}
            value={isbnText}
            inputMode="numeric"
            maxLength={20}
            autoComplete="off"
            aria-invalid={tried && isbnProblem !== undefined}
            aria-describedby={tried && isbnProblem ? `${id}-isbn-problem` : undefined}
            onChange={(event) => typed(setIsbnText)(event.target.value)}
          />
          {tried && isbnProblem && (
            <p id={`${id}-isbn-problem`} className={text.problem}>
              {isbnProblem}
            </p>
          )}
        </div>

        <ChoiceGroup label="Durum" options={STATES} selected={[draft.status]} onToggle={pick} />

        {draft.status !== 'want' && (
          <div className={fields.pair}>
            <div className={fields.field}>
              <label className={fields.label} htmlFor={`${id}-started`}>
                Başlama tarihi
              </label>
              <input id={`${id}-started`} className={fields.input} type="date" max={now} value={draft.startedAt ?? ''} onChange={(event) => setDay('startedAt', event.target.value)} />
            </div>
            {draft.status !== 'reading' && (
              <div className={fields.field}>
                <label className={fields.label} htmlFor={`${id}-finished`}>
                  {draft.status === 'abandoned' ? 'Bırakma tarihi' : 'Bitirme tarihi'}
                </label>
                <input id={`${id}-finished`} className={fields.input} type="date" max={now} value={draft.finishedAt ?? ''} onChange={(event) => setDay('finishedAt', event.target.value)} />
              </div>
            )}
          </div>
        )}
        {dates.map((problem) => (
          <p key={problem} className={text.problem} role="alert">
            {problem}
          </p>
        ))}

        {warned && (
          <p className={text.notice} role="status">
            Kitaplığında aynı adlı bir kitap var.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={restarting}
        title="Tekrar başlansın mı?"
        confirmLabel="Evet, tekrar başla"
        onConfirm={() => {
          setRestarting(false)
          setDraft(changeStatus(draft, 'reading', today()))
        }}
        onCancel={() => setRestarting(false)}
      >
        Bitirme tarihi ve puan silinecek.
      </ConfirmDialog>
    </Screen>
  )
}
