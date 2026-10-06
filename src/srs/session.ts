import type { Item } from '../content/schema'
import { partsFor, shuffle, type Part, type Rng } from './queue'

/** One question to ask: a single part of a single item. */
export interface Task {
  itemId: string
  part: Part
}

/**
 * A review (or lesson quiz) session. Each item has two parts; a wrong
 * answer puts that part back later in the queue. The item finishes once
 * every part has been answered correctly, with its total misses.
 * State is immutable so the UI can keep the previous one for "undo".
 */
export interface SessionState {
  queue: Task[]
  remaining: Record<string, Part[]>
  misses: Record<string, number>
  answered: number
  correct: number
  total: number
}

export interface Finished {
  itemId: string
  misses: number
}

export function startSession(items: readonly Item[], rng: Rng = Math.random): SessionState {
  const queue = shuffle(items.flatMap((i) => partsFor(i).map((part) => ({ itemId: i.id, part }))), rng)
  return {
    queue,
    remaining: Object.fromEntries(items.map((i) => [i.id, partsFor(i)])),
    misses: {},
    answered: 0,
    correct: 0,
    total: items.length,
  }
}

export function currentTask(s: SessionState): Task | undefined {
  return s.queue[0]
}

export function finishedCount(s: SessionState): number {
  return s.total - Object.keys(s.remaining).length
}

/** Where a missed task goes back in: a few questions later, or at the end. */
function requeueIndex(len: number, rng: Rng): number {
  if (len <= 2) return len
  const min = Math.min(3, len)
  return min + Math.floor(rng() * (len - min + 1))
}

export function answer(s: SessionState, correct: boolean, rng: Rng = Math.random): { state: SessionState; finished?: Finished } {
  const [task, ...rest] = s.queue
  if (!task) return { state: s }
  const base = { ...s, answered: s.answered + 1, correct: s.correct + (correct ? 1 : 0) }

  if (!correct) {
    const queue = [...rest]
    queue.splice(requeueIndex(queue.length, rng), 0, task)
    return { state: { ...base, queue, misses: { ...s.misses, [task.itemId]: (s.misses[task.itemId] ?? 0) + 1 } } }
  }

  const left = (s.remaining[task.itemId] ?? []).filter((p) => p !== task.part)
  const remaining = { ...s.remaining }
  if (left.length > 0) {
    remaining[task.itemId] = left
    return { state: { ...base, queue: rest, remaining } }
  }
  delete remaining[task.itemId]
  return {
    state: { ...base, queue: rest, remaining },
    finished: { itemId: task.itemId, misses: s.misses[task.itemId] ?? 0 },
  }
}
