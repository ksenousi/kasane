// Guards the hand-written content: every question built from it must have
// exactly one right answer among distinct options.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import plan from '../content/plan.json'
import { ITEMS, LEVELS, hasKanji, kanjiBreakdown } from '../src/content'

const vocab = ITEMS

describe('content', () => {
  it('gives every item a meaning hook, and a reading hook when the word has kanji', () => {
    const missing = ITEMS.filter((i) => !i.mnemonic?.meaning || (hasKanji(i.word) && !i.mnemonic.reading))
    expect(missing.map((i) => i.id)).toEqual([])
  })

  it('writes hooks as stories, not a restatement of the kanji chips', () => {
    // The sound hook must spell out the whole reading, so no syllable goes unhooked.
    const partial = ITEMS.filter((i) => !(hasKanji(i.word) ? i.mnemonic.reading! : i.mnemonic.meaning).includes(i.reading))
    expect(partial.map((i) => i.id)).toEqual([])
    // "滞 stay + 在 exist: ..." just repeats the chips shown above the hook.
    const formula = ITEMS.filter((i) => /^\S+ [a-zA-Z ;,()-]+ \+ /.test(i.mnemonic.meaning))
    expect(formula.map((i) => i.id)).toEqual([])
    // The meaning hook must land on the meaning it's teaching.
    const stop = new Set(['something', 'someone', 'oneself', 'with', 'from', 'into', 'that', 'very', 'the', 'and', 'for', 'one', 'not', 'all', 'get', 'out', 'off', 'put'])
    const unmentioned = ITEMS.filter((i) => {
      const words = i.meanings.flatMap((m) => m.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !stop.has(w))
      return words.length > 0 && !words.some((w) => i.mnemonic.meaning.toLowerCase().includes(w))
    })
    expect(unmentioned.map((i) => i.id)).toEqual([])
  })

  it('has a meaning for every kanji in words with two or more kanji', () => {
    const missing = ITEMS.flatMap((i) => kanjiBreakdown(i.word))
      .filter((p) => !p.meaning)
      .map((p) => p.kanji)
    expect([...new Set(missing)]).toEqual([])
  })

  it('has unique ids and sane levels', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length)
    for (const l of LEVELS) for (const i of l.items) expect(i.level).toBe(l.level)
  })

  it('points "(Level N)" in notes at the level that word is really in', () => {
    const levelOf = new Map(ITEMS.map((i) => [i.word, i.level]))
    const wrong = ITEMS.flatMap((i) =>
      [...JSON.stringify(i).matchAll(/([^\s、。,(（"]+?)\s?(?:\([^)]*?\))?\s?\(Level (\d+)\)/g)].flatMap((m) => {
        const w = m[1].replace(/^.*[ =:]/, '')
        const real = levelOf.get(w) ?? levelOf.get(w.replace(/^お/, ''))
        return real === Number(m[2]) ? [] : [`${i.word}: ${m[0]} (really ${real ?? 'not in Kasane'})`]
      }),
    )
    expect(wrong).toEqual([])
  })

  it.each(vocab.map((v) => [v.id, v] as const))('vocab %s is complete', (_, v) => {
    expect(v.reading).toMatch(/^[ぁ-ゖー]+$/)
    for (const r of v.readings ?? []) expect(r).toMatch(/^[ぁ-ゖー]+$/)
    if (!hasKanji(v.word)) expect(v.word).toBe(v.reading)
    expect(v.meanings.length).toBeGreaterThan(0)
    expect(v.examples.length).toBeGreaterThan(0)
    for (const e of v.examples) expect(e.ja).toContain(v.word.slice(0, 1))
  })

})

// Local-only guards: scripts/wanikani.mjs writes these files (gitignored, so CI skips them).
// Kasane skips vocab you've started on WaniKani and everything WaniKani teaches up to level 40.
const WK_FILES = ['wanikani-known.json', 'wanikani-upto40.json'].map((f) => new URL(`../content/source/${f}`, import.meta.url))
describe.each(WK_FILES.filter((f) => existsSync(f)).map((f) => [f.pathname.split('/').pop()!, f] as const))('WaniKani overlap (%s)', (_, file) => {
  // WaniKani often lists する verbs and な adjectives with the suffix (想像する, 静かな), so compare base forms.
  const base = (w: string) => {
    const b = w.replace(/(する|な|の|に|だ|と)$/, '')
    return /[\u4e00-\u9fff]/.test(b) ? b : w
  }
  it('has no Kasane vocab that WaniKani covers, in any form', () => {
    const known = new Set<string>(JSON.parse(readFileSync(file, 'utf-8')).words.flatMap((w: { word: string }) => [w.word, base(w.word)]))
    expect(vocab.flatMap((v) => (known.has(v.word) || known.has(base(v.word)) ? [v.word] : []))).toEqual([])
  })
  it('keeps the plan free of WaniKani words too', () => {
    const known = new Set<string>(JSON.parse(readFileSync(file, 'utf-8')).words.flatMap((w: { word: string }) => [w.word, base(w.word)]))
    const planned = plan.levels.flatMap((l) => l.vocab.map((v) => v.word))
    expect(planned.filter((w) => known.has(w) || known.has(base(w)))).toEqual([])
  })
})

// Content follows content/plan.json: each written level has exactly the planned words.
describe('level plan', () => {
  it.each(LEVELS.map((l) => [l.level, l] as const))('level %i matches the plan', (n, l) => {
    const p = plan.levels.find((x) => x.level === n)!
    const words = l.items.map((i) => `${i.word}:${i.reading}`)
    expect(words.sort()).toEqual(p.vocab.map((v) => `${v.word}:${v.reading}`).sort())
  })
})
