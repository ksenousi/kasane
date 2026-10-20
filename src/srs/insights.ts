// Read-outs for Home, worked out from progress and the answer log (after Kanigami's board).
import type { Item } from '../content/schema'
import type { Answer } from '../db'
import type { Progress } from './engine'
import { BURNED, FIRST_STAGE, GURU, HOUR, STAGES, type Stage } from './stages'
import { LEVEL_UP_FRACTION } from './unlock'

type ProgressMap = ReadonlyMap<string, Progress>
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/** Time from landing on `from` until a run of right answers reaches Guru. */
function toGuru(from: Stage): number {
  let t = 0
  for (let s = from; s < GURU; s++) t += STAGES[s as Stage].interval ?? 0
  return t
}

/** The soonest an item of the level could reach Guru if every answer is right. */
function soonestGuru(p: Progress | undefined, now: number): number {
  // Not learned yet: the lesson could be done now, then Apprentice 1 → Guru.
  if (!p || p.stage === 0 || p.dueAt === null) return now + toGuru(FIRST_STAGE)
  const next = Math.max(p.dueAt, now)
  return p.stage === GURU - 1 ? next : next + toGuru((p.stage + 1) as Stage)
}

export interface LevelUp {
  /** Earliest possible level-up, or null when the level is already passed. */
  at: number | null
  /** Words still needed at Guru. */
  need: number
  /** The words it waits on, soonest first: the `need` that can get there first. */
  waitingOn: Item[]
}

export function earliestLevelUp(items: readonly Item[], level: number, progress: ProgressMap, now: number): LevelUp {
  const inLevel = items.filter((i) => i.level === level)
  const passed = inLevel.filter((i) => progress.get(i.id)?.passedAt != null).length
  const need = Math.max(0, Math.ceil(inLevel.length * LEVEL_UP_FRACTION) - passed)
  if (need === 0) return { at: null, need: 0, waitingOn: [] }
  const ranked = inLevel
    .filter((i) => progress.get(i.id)?.passedAt == null)
    .map((i) => ({ item: i, at: soonestGuru(progress.get(i.id), now) }))
    .sort((a, b) => a.at - b.at)
    .slice(0, need)
  return { at: ranked[ranked.length - 1].at, need, waitingOn: ranked.map((r) => r.item) }
}

/** Words of the level one right answer from passing (Apprentice 4, never passed), with when they come up. */
export function passingNext(items: readonly Item[], level: number, progress: ProgressMap): { item: Item; dueAt: number }[] {
  return items
    .filter((i) => i.level === level)
    .flatMap((item) => {
      const p = progress.get(item.id)
      return p && p.stage === GURU - 1 && p.passedAt == null && p.dueAt !== null ? [{ item, dueAt: p.dueAt }] : []
    })
}

export interface Week {
  guru: number
  master: number
  enlightened: number
  burned: number
  /** Words missed in a review, so dropped back a stage (or held at Apprentice 1). */
  dropped: number
  /** Review answers given. */
  answers: number
  meaning: number | null
  reading: number | null
}

/** When the item was last reviewed, from its next due time (which is rounded down to the hour). */
function lastReviewed(p: Progress): number | null {
  const interval = STAGES[p.stage].interval
  return p.dueAt === null || interval === null ? null : p.dueAt - interval
}

export function pastWeek(progress: ProgressMap, answers: readonly Answer[], now: number): Week {
  const since = now - WEEK
  const all = [...progress.values()]
  // Master and Enlightened are only ever reached by moving up, so landing there this week means it moved up.
  const landed = (stage: Stage) => all.filter((p) => p.stage === stage && (lastReviewed(p) ?? 0) + HOUR > since).length
  const reviews = answers.filter((a) => a.at > since && (a.mode ?? 'review') === 'review')
  const share = (part: Answer['part']) => {
    const of = reviews.filter((a) => a.part === part)
    return of.length ? of.filter((a) => a.correct).length / of.length : null
  }
  return {
    guru: all.filter((p) => p.passedAt !== null && p.passedAt > since).length,
    master: landed(7 as Stage),
    enlightened: landed(8 as Stage),
    burned: all.filter((p) => p.burnedAt !== null && p.burnedAt > since).length,
    dropped: new Set(reviews.filter((a) => !a.correct).map((a) => a.itemId)).size,
    answers: reviews.length,
    meaning: share('meaning'),
    reading: share('reading'),
  }
}

/** Enlightened words that burn on a right answer in the next `days` days, soonest first. */
export function burnsSoon(progress: ProgressMap, now: number, days = 7): Progress[] {
  return [...progress.values()]
    .filter((p) => p.stage === BURNED - 1 && p.dueAt !== null && p.dueAt < now + days * DAY)
    .sort((a, b) => a.dueAt! - b.dueAt!)
}

/** The next round number above `n`: tens at first, then fifties, then hundreds. */
export function nextRound(n: number): number {
  const step = n < 50 ? 10 : n < 200 ? 50 : 100
  return (Math.floor(n / step) + 1) * step
}

export interface Milestone {
  label: string
  have: number
  goal: number
}

export function milestones(progress: ProgressMap, total: number): Milestone[] {
  const all = [...progress.values()]
  const guruUp = all.filter((p) => p.stage >= GURU).length
  const burned = all.filter((p) => p.stage === BURNED).length
  const taught = all.filter((p) => p.stage > 0).length
  const list: Milestone[] = [
    { label: 'at Guru or above', have: guruUp, goal: nextRound(guruUp) },
    { label: 'burned', have: burned, goal: nextRound(burned) },
    { label: `words learned of ${total}`, have: taught, goal: Math.min(total, nextRound(taught)) },
  ]
  return list.filter((m) => m.have < m.goal)
}
