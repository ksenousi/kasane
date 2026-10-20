import { describe, expect, it } from 'vitest'
import type { VocabItem } from '../src/content/schema'
import type { Answer } from '../src/db'
import { newProgress, type Progress } from '../src/srs/engine'
import { burnsSoon, earliestLevelUp, milestones, nextRound, passingNext, pastWeek } from '../src/srs/insights'
import { HOUR, STAGES } from '../src/srs/stages'

const NOW = Date.UTC(2026, 9, 20, 14)
const DAY = 24 * HOUR

function vocab(id: string, level = 1): VocabItem {
  return { id, level, word: id, reading: id, meanings: [id], pos: 'noun', examples: [], mnemonic: { meaning: '' } }
}
function prog(entries: Array<[string, Partial<Progress>]>): Map<string, Progress> {
  return new Map(entries.map(([id, p]) => [id, { ...newProgress(id), ...p }]))
}

describe('earliest level-up', () => {
  const items = Array.from({ length: 10 }, (_, i) => vocab(`w${i}`))

  it('needs 90% of the level at Guru and waits on the soonest words', () => {
    const p = prog([
      ...Array.from({ length: 7 }, (_, i) => [`w${i}`, { stage: 5, passedAt: NOW - DAY, dueAt: NOW + DAY }] as [string, Partial<Progress>]),
      ['w7', { stage: 4, dueAt: NOW + 3 * HOUR }], // passes at its next review
      ['w8', { stage: 3, dueAt: NOW - HOUR }], // overdue: now, then 47h at Apprentice 4
      ['w9', { stage: 1, dueAt: NOW + HOUR }],
    ])
    const lu = earliestLevelUp(items, 1, p, NOW)
    expect(lu.need).toBe(2)
    expect(lu.waitingOn.map((i) => i.id)).toEqual(['w7', 'w8'])
    expect(lu.at).toBe(NOW + STAGES[4].interval!)
  })

  it('counts an unlearned word from a lesson taken now', () => {
    const lu = earliestLevelUp([vocab('a')], 1, new Map(), NOW)
    expect(lu.at).toBe(NOW + (4 + 8 + 23 + 47) * HOUR)
  })

  it('is null once the level is passed', () => {
    const p = prog([['a', { stage: 5, passedAt: NOW }]])
    expect(earliestLevelUp([vocab('a')], 1, p, NOW)).toEqual({ at: null, need: 0, waitingOn: [] })
  })

  it('lists words one right answer from passing', () => {
    const p = prog([['a', { stage: 4, dueAt: NOW + HOUR }], ['b', { stage: 4, passedAt: NOW - 7 * DAY, dueAt: NOW }], ['c', { stage: 3, dueAt: NOW }]])
    expect(passingNext([vocab('a'), vocab('b'), vocab('c')], 1, p).map((x) => x.item.id)).toEqual(['a'])
  })
})

describe('past week', () => {
  it('counts what moved and splits accuracy by part', () => {
    const p = prog([
      ['g', { stage: 5, passedAt: NOW - 2 * DAY, dueAt: NOW + DAY }],
      ['old', { stage: 6, passedAt: NOW - 30 * DAY, dueAt: NOW + DAY }],
      ['m', { stage: 7, dueAt: NOW - DAY + STAGES[7].interval! }], // reviewed yesterday
      ['m2', { stage: 7, dueAt: NOW - 10 * DAY + STAGES[7].interval! }], // ten days ago
      ['b', { stage: 9, burnedAt: NOW - DAY }],
    ])
    const a = (itemId: string, part: Answer['part'], correct: boolean, at = NOW - HOUR, mode: Answer['mode'] = 'review'): Answer => ({ itemId, part, correct, at, mode })
    const w = pastWeek(p, [a('x', 'meaning', true), a('x', 'reading', false), a('y', 'reading', true), a('y', 'meaning', false, NOW - 8 * DAY), a('z', 'meaning', false, NOW, 'drill')], NOW)
    expect(w).toEqual({ guru: 1, master: 1, enlightened: 0, burned: 1, dropped: 1, answers: 3, meaning: 1, reading: 0.5 })
  })
})

describe('burns and milestones', () => {
  it('lists Enlightened words due this week', () => {
    const p = prog([['a', { stage: 8, dueAt: NOW + 3 * DAY }], ['b', { stage: 8, dueAt: NOW + DAY }], ['c', { stage: 8, dueAt: NOW + 9 * DAY }]])
    expect(burnsSoon(p, NOW).map((x) => x.itemId)).toEqual(['b', 'a'])
  })

  it('rounds up to tens, fifties, then hundreds', () => {
    expect([0, 9, 10, 49, 50, 199, 205].map(nextRound)).toEqual([10, 10, 20, 50, 100, 200, 300])
  })

  it('caps words learned at the total', () => {
    const p = prog(Array.from({ length: 703 }, (_, i) => [`w${i}`, { stage: 1 }] as [string, Partial<Progress>]))
    expect(milestones(p, 705).find((m) => m.label.startsWith('words'))).toEqual({ label: 'words learned of 705', have: 703, goal: 705 })
  })
})
