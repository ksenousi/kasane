import { BURNED, FIRST_STAGE, GURU, STAGES, clampStage, type Stage } from './stages'

/** Per-item SRS state, stored in IndexedDB. */
export interface Progress {
  itemId: string
  stage: Stage
  /** When the lesson was completed (stage 0 → 1). */
  startedAt: number | null
  /** First time the item reached Guru. Level-up counts this, like WaniKani's "passed". */
  passedAt: number | null
  burnedAt: number | null
  dueAt: number | null
  correct: number
  incorrect: number
}

export function newProgress(itemId: string): Progress {
  return { itemId, stage: 0, startedAt: null, passedAt: null, burnedAt: null, dueAt: null, correct: 0, incorrect: 0 }
}

function dueFrom(stage: Stage, now: number): number | null {
  const interval = STAGES[stage].interval
  return interval === null ? null : now + interval
}

/**
 * WaniKani's rule: a clean review moves up one stage. With misses, drop
 * ceil(misses / 2) × penalty, where penalty is 2 from Guru up and 1 below, never below Apprentice 1.
 */
export function nextStage(stage: Stage, misses: number): Stage {
  if (misses <= 0) return clampStage(Math.min(stage + 1, BURNED))
  const penalty = stage >= GURU ? 2 : 1
  return clampStage(Math.max(FIRST_STAGE, stage - Math.ceil(misses / 2) * penalty))
}

/** Finish a lesson: the item enters the review cycle at Apprentice 1. */
export function completeLesson(p: Progress, now: number): Progress {
  return { ...p, stage: FIRST_STAGE, startedAt: now, dueAt: dueFrom(FIRST_STAGE, now) }
}

/** Apply a finished review (all parts answered). `misses` counts wrong answers across parts. */
export function applyReview(p: Progress, misses: number, now: number): Progress {
  const stage = nextStage(p.stage, misses)
  return {
    ...p,
    stage,
    dueAt: dueFrom(stage, now),
    passedAt: p.passedAt ?? (stage >= GURU ? now : null),
    burnedAt: stage === BURNED ? now : null,
    correct: p.correct + (misses === 0 ? 1 : 0),
    incorrect: p.incorrect + (misses > 0 ? 1 : 0),
  }
}

/** "Give me choices" fallback in recall mode: counts as half a pass, so the stage holds and the timer restarts. */
export function holdReview(p: Progress, now: number): Progress {
  return { ...p, dueAt: dueFrom(p.stage, now) }
}

export function isDue(p: Progress, now: number): boolean {
  return p.stage >= FIRST_STAGE && p.stage < BURNED && p.dueAt !== null && p.dueAt <= now
}
