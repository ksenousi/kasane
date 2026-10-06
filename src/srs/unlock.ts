import type { Item } from '../content/schema'
import type { Progress } from './engine'

export const LEVEL_UP_FRACTION = 0.9

type ProgressMap = ReadonlyMap<string, Progress>

/** Share of a level's items that have reached Guru at least once. */
export function passedFraction(items: readonly Item[], level: number, progress: ProgressMap): number {
  const inLevel = items.filter((i) => i.level === level)
  if (inLevel.length === 0) return 1
  const passed = inLevel.filter((i) => progress.get(i.id)?.passedAt != null).length
  return passed / inLevel.length
}

/** Highest unlocked level: level 1 is always open, and each next level opens at 90% passed. */
export function currentLevel(items: readonly Item[], progress: ProgressMap): number {
  const maxLevel = Math.max(1, ...items.map((i) => i.level))
  let level = 1
  while (level < maxLevel && passedFraction(items, level, progress) >= LEVEL_UP_FRACTION) level++
  return level
}

/** Unlocked items not yet learned, in content order. */
export function lessonItems(items: readonly Item[], progress: ProgressMap): Item[] {
  const level = currentLevel(items, progress)
  return items.filter((i) => i.level <= level && (progress.get(i.id)?.stage ?? 0) === 0)
}
