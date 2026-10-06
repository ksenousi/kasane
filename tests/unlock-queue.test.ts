import { describe, expect, it } from 'vitest'
import type { Item, VocabItem } from '../src/content/schema'
import { newProgress, type Progress } from '../src/srs/engine'
import { forecast, partsFor, pickExercise, reviewQueue, stageCounts, supports } from '../src/srs/queue'
import type { Stage } from '../src/srs/stages'
import { currentLevel, lessonItems, passedFraction } from '../src/srs/unlock'

const NOW = Date.UTC(2026, 8, 27, 12)

function vocab(id: string, level: number, extra: Partial<VocabItem> = {}): VocabItem {
  return {
    id, level, word: id, reading: id, meanings: [id], pos: 'noun', examples: [],
    distractors: { readings: ['a', 'b', 'c'], meanings: ['x', 'y', 'z'], words: ['p', 'q', 'r'] },
    contextWrong: ['k', 'l', 'm'],
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

  it('buckets the 24h forecast by hour, overdue in hour 0', () => {
    const p = prog([
      ['v0', { stage: 2, dueAt: NOW - 5_000 }],
      ['v1', { stage: 2, dueAt: NOW + 90 * 60_000 }],
      ['v2', { stage: 2, dueAt: NOW + 30 * 3_600_000 }],
    ])
    const f = forecast(p.values(), NOW)
    expect(f[0]).toBe(1)
    expect(f[1]).toBe(1)
    expect(f.reduce((a, b) => a + b)).toBe(2)
  })

  it('counts items per stage group', () => {
    const c = stageCounts(prog([['a', { stage: 1 }], ['b', { stage: 5 }], ['c', { stage: 6 }], ['d', { stage: 9 }]]).values())
    expect(c).toMatchObject({ apprentice: 1, guru: 2, burned: 1, master: 0 })
  })
})

describe('pickExercise', () => {
  const rich = vocab('r', 1, {
    tiles: ['しゅ', 'う'],
    examples: [{ ja: '＿に行く', full: '学校に行く', en: 'go to school' }],
    paraphrase: { sentence: 's', answer: 'a', wrong: ['b', 'c', 'd'] },
    usage: { correct: 'c', wrong: ['w1', 'w2', 'w3'] },
  })

  it('uses easy formats for Apprentice items', () => {
    for (let i = 0; i < 20; i++) expect(['V1', 'V2']).toContain(pickExercise(rich, 'meaning', 2, Math.random))
  })

  it('uses hard formats for Master items that have the data', () => {
    for (let i = 0; i < 20; i++) expect(['V6', 'V7', 'V5']).toContain(pickExercise(rich, 'meaning', 7, Math.random))
  })

  it('falls back to an easier tier when data is missing', () => {
    const plain = vocab('p', 1)
    expect(['V1', 'V2']).toContain(pickExercise(plain, 'meaning', 8, () => 0))
    expect(pickExercise(plain, 'reading', 5, () => 0)).toBe('V10')
  })

  it('avoids repeating the last format when it can', () => {
    for (let i = 0; i < 20; i++) expect(pickExercise(rich, 'meaning', 2, Math.random, 'V1')).not.toBe('V1')
  })

  it('returns null when nothing fits', () => {
    const bare = vocab('b', 1, { distractors: { readings: [], meanings: ['x', 'y', 'z'], words: ['p', 'q', 'r'] } })
    expect(pickExercise(bare, 'reading', 3)).toBeNull()
  })
})

describe('kana-only vocab', () => {
  const kana = vocab('k', 1, { word: 'うっかり', reading: 'うっかり', examples: [{ ja: '＿忘れた。', full: 'うっかり忘れた。', en: 'I carelessly forgot.' }] })
  it('is asked about meaning only, never reading', () => {
    expect(partsFor(kana)).toEqual(['meaning'])
    expect(partsFor(vocab('j', 1, { word: '状況' }))).toEqual(['meaning', 'reading'])
  })
  it('never gets kanji-tile questions', () => {
    expect(supports(kana, 'V4')).toBe(false)
  })
})
