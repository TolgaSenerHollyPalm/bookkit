import { Button } from 'kitshelf-ui/ui/Button.tsx'
import ChoiceGroup from 'kitshelf-ui/ui/ChoiceGroup.tsx'
import RequiredMark from 'kitshelf-ui/ui/RequiredMark.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useToast } from 'kitshelf-ui/ui/toastContext.ts'
import { useId, useState } from 'react'
import { useAppData } from '../app/appData.ts'
import { href, navigate } from '../app/router.ts'
import { today } from '../books/dates.ts'
import { parseAuthors, readIsbnField } from '../books/form.ts'
import { findSame } from '../books/match.ts'
import { dateProblems, newBook, type NewBook } from '../books/status.ts'
import { STATUS_LABELS } from '../books/texts.ts'
import fields from '../ui/fields.module.css'

const PLACES: { value: NewBook['status']; label: string }[] = [
  { value: 'want', label: STATUS_LABELS.want },
  { value: 'reading', label: STATUS_LABELS.reading },
  { value: 'read', label: STATUS_LABELS.read },
]

/** Adds a book by typing it in: for the ones a search does not find. */
export default function AddBookScreen() {
  const { books, saveBook } = useAppData()
  const show = useToast()
  const id = useId()
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [isbnText, setIsbnText] = useState('')
  const [status, setStatus] = useState<NewBook['status']>('want')
  const [finishedAt, setFinishedAt] = useState('')
  const [tried, setTried] = useState(false)
  // The library already has this book: said once, and the next tap adds it anyway.
  const [warned, setWarned] = useState(false)

  const now = today()
  const { isbn, problem: isbnProblem } = readIsbnField(isbnText)
  const dates = status === 'read' && finishedAt ? dateProblems({ finishedAt }, now) : []
  const candidate = { title: title.trim(), authors: parseAuthors(authors), isbn }

  const submit = () => {
    setTried(true)
    if (candidate.title === '' || isbnProblem || dates.length > 0) return
    if (!warned && findSame(books, candidate)) {
      setWarned(true)
      return
    }
    const book = newBook({ id: crypto.randomUUID(), ...candidate, status, finishedAt: finishedAt || undefined, source: { kind: 'manual' } }, new Date())
    saveBook(book)
    show(`${book.title} kitaplığa eklendi`)
    navigate({ screen: 'book', bookId: book.id }, { replace: true })
  }

  // What was typed decides whether the book is a repeat, so any change asks again.
  const typed = (set: (value: string) => void) => (value: string) => {
    set(value)
    setWarned(false)
  }

  return (
    <Screen
      title="Elle ekle"
      back={href({ screen: 'home' })}
      footer={
        <Button variant="primary" big disabled={candidate.title === ''} onClick={submit}>
          {warned ? 'Yine de ekle' : 'Kitaplığa ekle'}
        </Button>
      }
    >
      <div className={fields.form}>
        <div className={fields.field}>
          <label className={fields.label} htmlFor={`${id}-title`}>
            Kitabın adı
            <RequiredMark />
          </label>
          <input id={`${id}-title`} className={fields.input} value={title} maxLength={200} autoComplete="off" autoFocus onChange={(event) => typed(setTitle)(event.target.value)} />
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

        <ChoiceGroup label="Nereye eklensin?" options={PLACES} selected={[status]} onToggle={setStatus} />

        {status === 'read' && (
          <div className={fields.field}>
            <label className={fields.label} htmlFor={`${id}-finished`}>
              Bitirme tarihi <span className={fields.optional}>(isteğe bağlı)</span>
            </label>
            <input id={`${id}-finished`} className={fields.input} type="date" max={now} value={finishedAt} onChange={(event) => setFinishedAt(event.target.value)} />
            {dates.map((problem) => (
              <p key={problem} className={text.problem}>
                {problem}
              </p>
            ))}
          </div>
        )}

        {warned && (
          <p className={text.notice} role="status">
            Kitaplığında aynı adlı bir kitap var.
          </p>
        )}
      </div>
    </Screen>
  )
}
