import { hasKanji } from '../content'
import type { Item } from '../content/schema'
import { isDue, type Progress } from './engine'
import { stageGroup, type StageGroup } from './stages'

export type Rng = () => number

export function shuffle<T>(xs: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Items due for review, in random order. */
export function reviewQueue(items: readonly Item[], progress: ReadonlyMap<string, Progress>, now: number, rng: Rng = Math.random): Item[] {
  return shuffle(
    items.filter((i) => {
      const p = progress.get(i.id)
      return p !== undefined && isDue(p, now)
    }),
    rng,
  )
}

/** How many reviews become due in each of the next `hours` hours (index 0 = due now or overdue). */
export interface Hour {
  /** Start of the clock hour (ms). */
  at: number
  count: number
}

/**
 * Reviews per clock hour: the current hour (with everything already overdue) and the
 * `hours - 1` after it. Aligned to the hour so each column can be named, like Kanigami's.
 */
export function forecast(progress: Iterable<Progress>, now: number, hours = 25): Hour[] {
  const start = new Date(now)
  start.setMinutes(0, 0, 0)
  const buckets: Hour[] = Array.from({ length: hours }, (_, i) => {
    const at = new Date(start)
    at.setHours(start.getHours() + i)
    return { at: at.getTime(), count: 0 }
  })
  for (const p of progress) {
    if (p.dueAt === null || p.stage === 0 || p.stage === 9) continue
    const h = hourOf(buckets, p.dueAt)
    if (h !== null) buckets[h].count++
  }
  return buckets
}

/** Which forecast hour a due time falls in: the first for anything already due, null past the last. */
export function hourOf(hours: readonly Hour[], at: number): number | null {
  if (hours.length === 0 || at >= hours[hours.length - 1].at + 3_600_000) return null
  let h = 0
  while (h + 1 < hours.length && hours[h + 1].at <= at) h++
  return h
}

export function stageCounts(progress: Iterable<Progress>): Record<StageGroup, number> {
  const counts: Record<StageGroup, number> = { lesson: 0, apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 }
  for (const p of progress) counts[stageGroup(p.stage)]++
  return counts
}

// ---- Prompts ---------------------------------------------------------------

/** Each review asks for the meaning and the reading. The item only moves once both are answered. */
export type Part = 'meaning' | 'reading'

export function partsFor(item: Item): Part[] {
  // Kana-only words have nothing to read, so they're asked about meaning only.
  return hasKanji(item.word) ? ['meaning', 'reading'] : ['meaning']
}
