// WaniKani-style SRS stages. Stage 0 = unlocked but not yet learned (in Lessons).

export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type StageGroup = 'lesson' | 'apprentice' | 'guru' | 'master' | 'enlightened' | 'burned'

export const HOUR = 60 * 60 * 1000

interface StageInfo {
  name: string
  group: StageGroup
  /** Wait before the next review after landing on this stage; null = no more reviews. */
  interval: number | null
}

/**
 * WaniKani's intervals: 4h, 8h, then a day/2 days/1 week/2 weeks/1 month/4 months less an hour,
 * so a review done at the same time of day is ready again at that time.
 */
export const STAGES: Record<Stage, StageInfo> = {
  0: { name: 'Lesson', group: 'lesson', interval: null },
  1: { name: 'Apprentice 1', group: 'apprentice', interval: 4 * HOUR },
  2: { name: 'Apprentice 2', group: 'apprentice', interval: 8 * HOUR },
  3: { name: 'Apprentice 3', group: 'apprentice', interval: 23 * HOUR },
  4: { name: 'Apprentice 4', group: 'apprentice', interval: 47 * HOUR },
  5: { name: 'Guru 1', group: 'guru', interval: 166 * HOUR },
  6: { name: 'Guru 2', group: 'guru', interval: 335 * HOUR },
  7: { name: 'Master', group: 'master', interval: 719 * HOUR },
  8: { name: 'Enlightened', group: 'enlightened', interval: 2879 * HOUR },
  9: { name: 'Burned', group: 'burned', interval: null },
}

export const FIRST_STAGE: Stage = 1
export const GURU: Stage = 5
export const BURNED: Stage = 9

export function stageGroup(stage: Stage): StageGroup {
  return STAGES[stage].group
}

export function clampStage(n: number): Stage {
  return Math.max(0, Math.min(9, Math.round(n))) as Stage
}

/** Position within a multi-step group (Apprentice 1–4, Guru 1–2); null for single-step groups. */
export function stageStep(stage: Stage): { step: number; of: number } | null {
  if (stage >= 1 && stage <= 4) return { step: stage, of: 4 }
  if (stage === 5 || stage === 6) return { step: stage - 4, of: 2 }
  return null
}
