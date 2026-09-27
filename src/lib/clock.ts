// App clock. In dev builds Settings can shift it forward to test SRS timing
// without waiting hours; in production the offset is always 0.
const KEY = 'kasane.clockOffset'

function offset(): number {
  if (!import.meta.env.DEV) return 0
  try {
    return Number(localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}

export function now(): number {
  return Date.now() + offset()
}

export function advanceClock(ms: number): void {
  try {
    localStorage.setItem(KEY, String(offset() + ms))
  } catch {
    // Storage unavailable: the dev clock just doesn't move.
  }
}

export function resetClock(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function formatIn(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000))
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `${h}h`
  return `${Math.round(h / 24)} days`
}
