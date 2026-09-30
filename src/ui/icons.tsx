/** BookKit's own icons; the shared ones come from kitshelf-ui/ui/icons.tsx. */
import { lineIcon, type IconProps } from 'kitshelf-ui/ui/iconBase.ts'

/** A book being read. */
export function BookOpenIcon({ size = 14, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13" />
    </svg>
  )
}

export function SearchIcon({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20 20" />
    </svg>
  )
}

export function StarIcon({ size = 24, strokeWidth = 1.8, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg {...lineIcon(size, strokeWidth)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
    </svg>
  )
}

/** The opening mark over a quote. */
export function QuoteMark() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" aria-hidden="true">
      <path
        d="M2 26V16.5C2 8.6 6.2 3.2 13.6 1l1.6 3.4C10.8 6.3 8.9 9.4 8.7 13H14v13zM19.5 26V16.5c0-7.9 4.2-13.3 11.6-15.5l1.6 3.4c-4.4 1.9-6.3 5-6.5 8.6h5.3v13z"
        fill="currentColor"
      />
    </svg>
  )
}
