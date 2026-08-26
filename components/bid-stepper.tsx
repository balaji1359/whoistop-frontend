'use client'

/**
 * Whole-dollar − / + control. `min` is the floor (usually $1, or current bid + $1
 * when raising your own listing).
 */
export function BidStepper({
  value,
  min,
  onChange,
  variant = 'default',
}: {
  value: number
  min: number
  onChange: (next: number) => void
  /** Large inline control for the hero headline. */
  variant?: 'default' | 'hero'
}) {
  return (
    <div
      className={variant === 'hero' ? 'bid-stepper is-hero' : 'bid-stepper'}
      role="group"
      aria-label="Your bid amount"
    >
      <button
        type="button"
        className="bid-stepper-btn"
        aria-label="Decrease bid by $1"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="bid-stepper-amount num">${value}</span>
      <button
        type="button"
        className="bid-stepper-btn"
        aria-label="Increase bid by $1"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}
