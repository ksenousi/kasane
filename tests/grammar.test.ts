// The in-app grammar cheat sheet: 91 core N3 points, each with highlighted examples and well-formed furigana.
import { describe, expect, it } from 'vitest'
import grammar from '../src/content/grammar.json'

const points = grammar.flatMap((g) => g.points)

describe('grammar cheat sheet', () => {
  it('has the 91 core points, each once', () => {
    expect(points).toHaveLength(91)
    expect(new Set(points.map((p) => p.pattern)).size).toBe(91)
  })

  it.each(points.map((p) => [p.pattern, p] as const))('%s is complete', (_, p) => {
    expect(p.meaning && p.connection && p.note).toBeTruthy()
    expect(p.examples.length).toBeGreaterThanOrEqual(2)
    expect(typeof p.freq).toBe('number')
    expect(p.freq).toBeGreaterThan(0)
    for (const e of p.examples) {
      expect(e.ja).toMatch(/\{[^}]+\}/)
      expect(e.en.length).toBeGreaterThan(0)
      // Every [reading] follows kanji, and brackets are balanced.
      expect(e.ja.replace(/[一-鿿々]+\[[ぁ-ゖー・]+\]/g, '')).not.toMatch(/[[\]]/)
    }
  })
})
