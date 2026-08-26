export function formatUsd(value: number) {
  return `$${value.toLocaleString('en-US')}`
}

export function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value.toLocaleString('en-US')} ${value === 1 ? singular : plural}`
}

/**
 * "Aug 25, 2:33 PM" — when a listing was first added.
 *
 * Rendered in the viewer's own timezone, which is why every call site that
 * shows it needs suppressHydrationWarning: the server prerenders in UTC and
 * the browser re-renders locally, and React would otherwise flag the mismatch.
 */
export function formatListedAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** "3 days ago" — coarse age, for tooltips and detail panels. */
export function formatAge(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000)
  const days = Math.floor(seconds / 86400)
  if (days >= 1) return formatCount(days, 'day') + ' ago'

  const hours = Math.floor(seconds / 3600)
  if (hours >= 1) return formatCount(hours, 'hour') + ' ago'

  const minutes = Math.floor(seconds / 60)
  if (minutes >= 1) return formatCount(minutes, 'minute') + ' ago'
  return 'just now'
}

export function formatClock(total: number) {
  const safe = Math.max(0, total)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  }
}

export function formatClockSegments(total: number) {
  const safe = Math.max(0, total)
  return {
    hours: String(Math.floor(safe / 3600)).padStart(2, '0'),
    minutes: String(Math.floor((safe % 3600) / 60)).padStart(2, '0'),
    seconds: String(safe % 60).padStart(2, '0'),
  }
}
