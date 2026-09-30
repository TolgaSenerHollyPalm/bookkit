import { useRef, type KeyboardEvent } from 'react'
import { TABS, type Tab } from '../books/library.ts'
import { TAB_LABELS } from '../books/texts.ts'
import styles from './LibraryTabs.module.css'

interface LibraryTabsProps {
  counts: Record<Tab, number>
  selected: Tab
  onSelect: (tab: Tab) => void
  panelId: string // the element that shows the chosen tab's books
}

/** The library's three lists, each with how many books it holds; the arrow keys move between them. */
export default function LibraryTabs({ counts, selected, onSelect, panelId }: LibraryTabsProps) {
  const list = useRef<HTMLDivElement>(null)

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const next = TABS[(TABS.indexOf(selected) + step + TABS.length) % TABS.length]
    onSelect(next)
    list.current?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus()
  }

  return (
    <div ref={list} className={styles.tabs} role="tablist" aria-label="Kitap listesi" onKeyDown={onKeyDown}>
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          data-tab={tab}
          className={styles.tab}
          aria-selected={tab === selected}
          aria-controls={panelId}
          tabIndex={tab === selected ? 0 : -1}
          onClick={() => onSelect(tab)}
        >
          {TAB_LABELS[tab]}
          <span className={styles.count}>{counts[tab]}</span>
        </button>
      ))}
    </div>
  )
}
