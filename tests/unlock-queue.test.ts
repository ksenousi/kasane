import { describe, expect, it } from 'vitest'
import type { Item, VocabItem } from '../src/content/schema'
import { newProgress, type Progress } from '../src/srs/engine'
import { forecast, partsFor, reviewQueue, stageCounts } from '../src/srs/queue'
import type { Stage } from '../src/srs/stages'
import { currentLevel, lessonItems, passedFraction } from '../src/srs/unlock'

const NOW = Date.UTC(2026, 8, 27, 12)

function vocab(id: string, level: number, extra: Partial<VocabItem> = {}): VocabItem {
  return {
    id, level, word: id, reading: id, meanings: [id], pos: 'noun', examples: [], mnemonic: { meaning: '' },
    ...extra,
  }
}

function prog(entries: Array<[string, Partial<Progress>]>): Map<string, Progress> {
  return new Map(entries.map(([id, p]) => [id, { ...newProgress(id), ...p }]))
}

const ten = Array.from({ length: 10 }, (_, i) => vocab(`v${i}`, 1))
const items: Item[] = [...ten, vocab('w1', 2)]

describe('level unlocking', () => {
  it('opens level 2 only when 90% of level 1 has been Guru', () => {
    const eight = prog(ten.slice(0, 8).map((v) => [v.id, { passedAt: NOW }]))
    expect(currentLevel(items, eight)).toBe(1)
    const nine = prog(ten.slice(0, 9).map((v) => [v.id, { passedAt: NOW }]))
    expect(passedFraction(items, 1, nine)).toBeCloseTo(0.9)
    expect(currentLevel(items, nine)).toBe(2)
  })

  it('counts items that passed and later dropped', () => {
    const p = prog(ten.map((v) => [v.id, { passedAt: NOW, stage: 2 as Stage }]))
    expect(currentLevel(items, p)).toBe(2)
  })
})

describe('lessons', () => {
  it('lists unlearned items from open levels only, in content order', () => {
    expect(lessonItems(items, new Map()).map((i) => i.id)).toEqual(ten.map((v) => v.id))
    const later = lessonItems(items, prog([['v0', { stage: 1 }], ['v1', { stage: 1 }]]))
    expect(later.map((i) => i.id)).toEqual(ten.slice(2).map((v) => v.id))
  })
})

describe('queues', () => {
  it('returns only due, unburned items', () => {
    const p = prog([
      ['v0', { stage: 2, dueAt: NOW - 1 }],
      ['v1', { stage: 2, dueAt: NOW + 1 }],
      ['v2', { stage: 9, dueAt: null }],
      ['v3', { stage: 0, dueAt: null }],
    ])
    expect(reviewQueue(items, p, NOW).map((i) => i.id)).toEqual(['v0'])
  })

  it('buckets the forecast by clock hour, overdue in the current hour', () => {
    const now = NOW + 20 * 60_000 // 20 past the hour
    const p = prog([
      ['v0', { stage: 2, dueAt: now - 5_000 }],
      ['v1', { stage: 2, dueAt: now + 30 * 60_000 }], // 50 past: still this hour
      ['v2', { stage: 2, dueAt: now + 50 * 60_000 }], // 10 past the next hour
      ['v3', { stage: 2, dueAt: now + 30 * 3_600_000 }], // off the chart
    ])
    const f = forecast(p.values(), now)
    expect(f).toHaveLength(25)
    expect(f[0]).toEqual({ at: NOW, count: 2 })
    expect(f[1]).toEqual({ at: NOW + 3_600_000, count: 1 })
    expect(f.reduce((a, h) => a + h.count, 0)).toBe(3)
  })

  it('counts items per stage group', () => {
    const c = stageCounts(prog([['a', { stage: 1 }], ['b', { stage: 5 }], ['c', { stage: 6 }], ['d', { stage: 9 }]]).values())
    expect(c).toMatchObject({ apprentice: 1, guru: 2, burned: 1, master: 0 })
  })
})

describe('kana-only vocab', () => {
  it('is asked about meaning only, never reading', () => {
    expect(partsFor(vocab('k', 1, { word: 'うっかり', reading: 'うっかり' }))).toEqual(['meaning'])
    expect(partsFor(vocab('j', 1, { word: '状況' }))).toEqual(['meaning', 'reading'])
  })
})
