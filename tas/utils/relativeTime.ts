/**
 * Format a timestamp as a relative time string
 * e.g., "now", "2 min ago", "1 hour ago", "Yesterday", etc.
 *
 * Uses milliseconds since epoch (same format as Date.now() and Chrome's lastAccessed)
 */
export function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return ""

  const now = Date.now()
  const diff = now - timestamp

  // Less than 10 seconds
  if (diff < 10 * 1000) {
    return "now"
  }

  // Less than 1 minute
  if (diff < 60 * 1000) {
    const seconds = Math.floor(diff / 1000)
    return `${seconds} sec ago`
  }

  // Less than 1 hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes} min ago`
  }

  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  }

  // Less than 48 hours
  if (diff < 48 * 60 * 60 * 1000) {
    return "Yesterday"
  }

  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days} days ago`
  }

  // Less than 30 days
  if (diff < 30 * 24 * 60 * 60 * 1000) {
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
  }

  // Older - show date
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
