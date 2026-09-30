import styles from './FilterChips.module.css'

interface FilterChipsProps<T extends string> {
  label: string // names the row for screen readers, e.g. "Göster"
  options: { value: T; label: string }[]
  selected: T
  onSelect: (value: T) => void
}

/** A row of small round choices over a list, one of them on. */
export default function FilterChips<T extends string>({ label, options, selected, onSelect }: FilterChipsProps<T>) {
  return (
    <div className={styles.row} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className={styles.target} aria-pressed={option.value === selected} onClick={() => onSelect(option.value)}>
          <span className={styles.chip}>{option.label}</span>
        </button>
      ))}
    </div>
  )
}
