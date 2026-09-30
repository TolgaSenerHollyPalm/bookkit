import { CloseIcon } from 'kitshelf-ui/ui/icons.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useId, useRef } from 'react'
import { SearchIcon } from './icons.tsx'
import styles from './SearchField.module.css'

interface SearchFieldProps {
  label: string // for screen readers; sighted users read the placeholder
  placeholder: string
  value: string
  onChange: (value: string) => void
  describedBy?: string
}

/** The box of a search that runs while it is typed in. */
export default function SearchField({ label, placeholder, value, onChange, describedBy }: SearchFieldProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  return (
    <form
      role="search"
      className={styles.field}
      onSubmit={(event) => {
        event.preventDefault()
        // The search has already run; the keyboard's own key only has to get the keyboard out of the results' way.
        input.current?.blur()
      }}
    >
      <SearchIcon />
      <label className={text.visuallyHidden} htmlFor={id}>
        {label}
      </label>
      <input
        ref={input}
        id={id}
        className={styles.input}
        type="search"
        enterKeyHint="search"
        placeholder={placeholder}
        value={value}
        maxLength={120}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      {value !== '' && (
        <button
          type="button"
          className={styles.clear}
          aria-label="Aramayı temizle"
          onClick={() => {
            onChange('')
            input.current?.focus()
          }}
        >
          <span className={styles.clearMark}>
            <CloseIcon size={12} strokeWidth={3} />
          </span>
        </button>
      )}
    </form>
  )
}
