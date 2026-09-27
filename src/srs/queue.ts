import type { Item } from '../content/schema'
import { isDue, type Progress } from './engine'
import { stageGroup, type Stage, type StageGroup } from './stages'

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

// ---- Question choice -------------------------------------------------------

/**
 * Each review asks two parts: vocab needs meaning + reading, grammar needs
 * meaning + connection. The item only moves once both are answered.
 */
export type Part = 'meaning' | 'reading' | 'connection'

export type ExerciseId =
  | 'V1' | 'V2' | 'V3' | 'V5' | 'V6' | 'V7' | 'V10'
  | 'G1' | 'G2' | 'G3' | 'G5' | 'G6' | 'G7'

export function partsFor(item: Item): Part[] {
  return item.kind === 'vocab' ? ['meaning', 'reading'] : ['meaning', 'connection']
}

type Tier = 'apprentice' | 'guru' | 'master'

function tier(stage: Stage): Tier {
  if (stage <= 4) return 'apprentice'
  if (stage <= 6) return 'guru'
  return 'master'
}

/** Harder formats as the item climbs. Canvas: "Exercise types" page. */
const POOLS: Record<Part, Record<Tier, ExerciseId[]>> = {
  meaning: {
    apprentice: ['V1', 'V2'],
    guru: ['V5', 'V1', 'V2'],
    master: ['V6', 'V7', 'V5'],
  },
  reading: {
    apprentice: ['V10'],
    guru: ['V3', 'V10'],
    master: ['V3'],
  },
  connection: {
    apprentice: ['G3'],
    guru: ['G3'],
    master: ['G3'],
  },
}

const GRAMMAR_MEANING: Record<Tier, ExerciseId[]> = {
  apprentice: ['G1', 'G6'],
  guru: ['G2', 'G1'],
  master: ['G5', 'G7', 'G2'],
}

/** Does the item have the data this exercise needs? */
export function supports(item: Item, ex: ExerciseId): boolean {
  if (item.kind === 'vocab') {
    switch (ex) {
      case 'V3': return !!item.tiles?.length
      case 'V5': return item.examples.some((e) => e.ja.includes('＿')) && item.contextWrong.length >= 3
      case 'V6': return !!item.paraphrase
      case 'V7': return !!item.usage
      case 'V10': return item.examples.length > 0 || item.distractors.readings.length >= 3
      case 'V1': case 'V2': return true
      default: return false
    }
  }
  switch (ex) {
    case 'G1': return item.examples.some((e) => e.ja.includes('＿')) && item.confusables.length >= 3
    case 'G2': return !!item.order
    case 'G3': return !!item.forms
    case 'G5': return !!item.errorSpot
    case 'G6': return !!item.translate
    case 'G7': return !!item.situation
    default: return false
  }
}

/**
 * Pick a question format for one part of a review. Falls back to easier
 * tiers when the item lacks data for the harder formats, and avoids
 * repeating `last` when there's a choice.
 */
export function pickExercise(item: Item, part: Part, stage: Stage, rng: Rng = Math.random, last?: ExerciseId): ExerciseId | null {
  const order: Tier[] = tier(stage) === 'master' ? ['master', 'guru', 'apprentice'] : tier(stage) === 'guru' ? ['guru', 'apprentice'] : ['apprentice']
  for (const t of order) {
    const pool = (item.kind === 'grammar' && part === 'meaning' ? GRAMMAR_MEANING[t] : POOLS[part][t]).filter((ex) => supports(item, ex))
    if (pool.length === 0) continue
    const fresh = pool.length > 1 && last ? pool.filter((ex) => ex !== last) : pool
    return fresh[Math.floor(rng() * fresh.length)]
  }
  return null
}
