import text from 'kitshelf-ui/ui/text.module.css'
import type { Rating } from '../books/types.ts'
import { StarIcon } from './icons.tsx'
import styles from './Stars.module.css'

const STARS: Rating[] = [1, 2, 3, 4, 5]

interface StarsProps {
  rating?: Rating
  labelledBy: string // the id of the heading that names the group
  describedBy?: string // the id of the hint, while the stars cannot be used
  disabled?: boolean
  onRate: (stars: Rating) => void // the star already chosen comes back too: the caller takes the rating away
}

/** Five stars to tap; each is its own button, pressed up to the rating. */
export default function Stars({ rating, labelledBy, describedBy, disabled, onRate }: StarsProps) {
  const lit = rating ?? 0
  return (
    <div className={styles.stars} role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          className={star <= lit ? `${styles.star} ${styles.on}` : styles.star}
          aria-label={`${star} yıldız`}
          aria-pressed={star <= lit}
          disabled={disabled}
          onClick={() => onRate(star)}
        >
          <StarIcon filled={star <= lit} />
        </button>
      ))}
    </div>
  )
}

/** The rating on a library card: one star and the number. */
export function SmallRating({ rating }: { rating: Rating }) {
  return (
    <span className={styles.small}>
      <StarIcon size={14} strokeWidth={2} filled />
      <span className={text.visuallyHidden}>Puan: </span>
      {rating}
    </span>
  )
}
