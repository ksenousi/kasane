import { describe, expect, it } from 'vitest'
import { ITEMS, ITEMS_BY_ID } from '../src/content'
import { buildQuestion } from '../src/exercises/build'
import { supports, type ExerciseId } from '../src/srs/queue'
import { answer, answerAllParts, currentTask, finishedCount, markHeld, startSession } from '../src/srs/session'

const ALL: ExerciseId[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V10', 'G1', 'G2', 'G3', 'G5', 'G6', 'G7']

describe('session', () => {
  const items = ['v-gaman', 'g-uchini'].map((id) => ITEMS_BY_ID.get(id)!)

  it('asks two parts per item and finishes an item after both are right', () => {
    let s = startSession(items)
    expect(s.queue).toHaveLength(4)
    const done: string[] = []
    while (currentTask(s)) {
      const r = answer(s, true)
      s = r.state
      if (r.finished) done.push(r.finished.itemId)
    }
    expect(done.sort()).toEqual(['g-uchini', 'v-gaman'])
    expect(finishedCount(s)).toBe(2)
  })

  it('requeues a missed part and reports total misses', () => {
    let s = startSession(items.slice(0, 1))
    const first = currentTask(s)!
    s = answer(s, false).state
    expect(s.queue).toHaveLength(2)
    expect(s.queue.filter((t) => t.part === first.part)).toHaveLength(1)
    let finished
    while (currentTask(s)) {
      const r = answer(s, true)
      s = r.state
      finished = r.finished ?? finished
    }
    expect(finished).toEqual({ itemId: 'v-gaman', misses: 1, held: false })
  })

  it('finishes all parts at once in recall mode, keeping the held flag', () => {
    let s = startSession(items.slice(0, 1))
    s = markHeld(s, 'v-gaman')
    const r = answerAllParts(s)
    expect(r.state.queue).toHaveLength(0)
    expect(r.finished).toEqual({ itemId: 'v-gaman', misses: 0, held: true })
  })
})

describe('buildQuestion', () => {
  it('builds every supported exercise for every item with one correct option', () => {
    for (const item of ITEMS) {
      for (const ex of ALL.filter((e) => supports(item, e))) {
        const q = buildQuestion(item, ex)
        if (q.kind === 'choice') {
          expect(q.options.filter((o) => o === q.answer), `${item.id} ${ex}`).toHaveLength(1)
          expect(new Set(q.options).size).toBe(q.options.length)
        } else if (q.kind === 'tiles') {
          expect(q.tiles.length).toBeGreaterThan(0)
        } else {
          expect([...q.pool].sort()).toEqual([...q.correct].sort())
        }
      }
    }
  })
})
