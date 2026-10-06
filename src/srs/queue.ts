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
export function forecast(progress: Iterable<Progress>, now: number, hours = 24): number[] {
  const buckets = new Array<number>(hours).fill(0)
  for (const p of progress) {
    if (p.dueAt === null || p.stage === 0 || p.stage === 9) continue
    const h = Math.max(0, Math.floor((p.dueAt - now) / 3_600_000))
    if (h < hours) buckets[h]++
  }
  return buckets
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
