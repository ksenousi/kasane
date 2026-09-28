// WaniKani-style SRS stages. Stage 0 = unlocked but not yet learned (in Lessons).

export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type StageGroup = 'lesson' | 'apprentice' | 'guru' | 'master' | 'enlightened' | 'burned'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

interface StageInfo {
  name: string
  group: StageGroup
  /** Wait before the next review after landing on this stage; null = no more reviews. */
  interval: number | null
}

export const STAGES: Record<Stage, StageInfo> = {
  0: { name: 'Lesson', group: 'lesson', interval: null },
  1: { name: 'Apprentice 1', group: 'apprentice', interval: 4 * HOUR },
  2: { name: 'Apprentice 2', group: 'apprentice', interval: 8 * HOUR },
  3: { name: 'Apprentice 3', group: 'apprentice', interval: 1 * DAY },
  4: { name: 'Apprentice 4', group: 'apprentice', interval: 2 * DAY },
  5: { name: 'Guru 1', group: 'guru', interval: 7 * DAY },
  6: { name: 'Guru 2', group: 'guru', interval: 14 * DAY },
  7: { name: 'Master', group: 'master', interval: 30 * DAY },
  8: { name: 'Enlightened', group: 'enlightened', interval: 120 * DAY },
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
