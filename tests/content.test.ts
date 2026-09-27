// Guards the hand-written content: every question built from it must have
// exactly one right answer among distinct options.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ITEMS, ITEMS_BY_ID, LEVELS } from '../src/content'

const vocab = ITEMS.filter((i) => i.kind === 'vocab')
const grammar = ITEMS.filter((i) => i.kind === 'grammar')

function distinct(xs: string[]) {
  return new Set(xs).size === xs.length
}

describe('content', () => {
  it('has unique ids and sane levels', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length)
    for (const l of LEVELS) for (const i of l.items) expect(i.level).toBe(l.level)
  })

  it.each(vocab.map((v) => [v.id, v] as const))('vocab %s is complete', (_, v) => {
    if (v.kind !== 'vocab') return
    expect(v.reading).toMatch(/^[ぁ-ゖー]+$/)
    expect(v.meanings.length).toBeGreaterThan(0)
    expect(v.distractors.readings).toHaveLength(3)
    expect(v.distractors.meanings).toHaveLength(3)
    expect(v.distractors.words).toHaveLength(3)
    expect(v.contextWrong).toHaveLength(3)
    expect(distinct([v.reading, ...v.distractors.readings])).toBe(true)
    expect(distinct([v.word, ...v.distractors.words])).toBe(true)
    expect(distinct([v.word, ...v.contextWrong])).toBe(true)
    for (const e of v.examples) {
      expect(e.ja.split('＿')).toHaveLength(2)
      expect(e.ja.replace('＿', v.word)).toBe(e.full)
    }
    if (v.tiles) expect(v.tiles.join('')).toBe(v.reading)
    if (v.paraphrase) expect(v.paraphrase.sentence).toContain(`【${v.word}】`)
    if (v.usage) expect(v.usage.correct).toContain(v.word.slice(0, 1))
  })

  it.each(grammar.map((g) => [g.id, g] as const))('grammar %s is complete', (_, g) => {
    if (g.kind !== 'grammar') return
    for (const id of g.requires) expect(ITEMS_BY_ID.get(id)?.kind).toBe('vocab')
    expect(g.examples.length).toBeGreaterThan(0)
    const bare = g.pattern.replace('〜', '')
    for (const e of g.examples) {
      expect(e.ja.split('＿')).toHaveLength(2)
      expect(e.full.startsWith(e.ja.split('＿')[0] + bare)).toBe(true)
    }
    expect(g.confusables.length).toBeGreaterThanOrEqual(3)
    expect(g.confusables).not.toContain(g.pattern)
    if (g.forms) {
      expect(distinct([g.forms.answer, ...g.forms.wrong])).toBe(true)
      expect(g.forms.sentence.split('＿')).toHaveLength(2)
    }
    if (g.order) expect(g.order.star).toBeLessThan(g.order.chunks.length)
    if (g.errorSpot) expect(g.errorSpot.wrong).toBeLessThan(g.errorSpot.chunks.length)
    if (g.situation) expect(distinct([g.situation.answer, ...g.situation.wrong])).toBe(true)
  })
})

// Local-only guards: scripts/wanikani.mjs writes these files (gitignored, so CI skips them).
// Kasane skips vocab you've started on WaniKani and everything WaniKani teaches up to level 35.
const WK_FILES = ['wanikani-known.json', 'wanikani-upto35.json'].map((f) => new URL(`../content/source/${f}`, import.meta.url))
describe.each(WK_FILES.filter((f) => existsSync(f)).map((f) => [f.pathname.split('/').pop()!, f] as const))('WaniKani overlap (%s)', (_, file) => {
  it('has no Kasane vocab that WaniKani covers', () => {
    const known = new Set<string>(JSON.parse(readFileSync(file, 'utf-8')).words.map((w: { word: string }) => w.word))
    expect(vocab.flatMap((v) => (v.kind === 'vocab' && known.has(v.word) ? [v.word] : []))).toEqual([])
  })
})
