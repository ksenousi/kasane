import { describe, expect, it } from 'vitest'
import { ITEMS_BY_ID } from '../src/content'
import type { Item } from '../src/content/schema'
import { checkAnswer, editDistance, finishKana, imeKana, normalizeMeaning } from '../src/srs/answer'
import { answer, currentTask, finishedCount, startSession } from '../src/srs/session'

describe('session', () => {
  const items = ['v-gaman', 'v-setsuyaku'].map((id) => ITEMS_BY_ID.get(id)!)

  it('asks two parts per item and finishes an item after both are right', () => {
    let s = startSession(items)
    expect(s.queue).toHaveLength(4)
    const done: string[] = []
    while (currentTask(s)) {
      const r = answer(s, true)
      s = r.state
      if (r.finished) done.push(r.finished.itemId)
    }
    expect(done.sort()).toEqual(['v-gaman', 'v-setsuyaku'])
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
    expect(finished).toEqual({ itemId: 'v-gaman', misses: 1 })
  })
})

const word: Item = {
  id: 'v-test', level: 1, word: '我慢', reading: 'がまん', meanings: ['putting up with', 'patience', 'endurance (of pain)'],
  accept: ['tolerance'], pos: 'noun', mnemonic: { meaning: '', reading: '' }, examples: [],
}

describe('typing kana', () => {
  it('turns romaji into hiragana as you type, holding a lone n', () => {
    expect(imeKana('gaman')).toBe('がまn')
    expect(imeKana('gamann')).toBe('がまん')
    expect(imeKana('kekkon')).toBe('けっこn')
  })

  it('finishes a trailing n and folds katakana on submit', () => {
    expect(finishKana('がまn')).toBe('がまん')
    expect(finishKana('ガマン')).toBe('がまん')
  })
})

describe('checking meanings', () => {
  const meaning = (s: string) => checkAnswer('meaning', s, word)

  it('accepts any listed meaning, ignoring case, punctuation and "to"/"a"', () => {
    expect(meaning('Patience')).toEqual({ kind: 'correct', close: false })
    expect(meaning('  to put up with ')).toEqual({ kind: 'wrong' })
    expect(meaning('putting up with!')).toEqual({ kind: 'correct', close: false })
    expect(meaning('an endurance')).toEqual({ kind: 'correct', close: false })
  })

  it('accepts the form without the parenthesised part, and hidden synonyms', () => {
    expect(meaning('endurance')).toEqual({ kind: 'correct', close: false })
    expect(meaning('endurance of pain')).toEqual({ kind: 'correct', close: false })
    expect(meaning('tolerance')).toEqual({ kind: 'correct', close: false })
  })

  it('lets small typos through as "close"', () => {
    expect(meaning('pateince')).toEqual({ kind: 'correct', close: true })
    expect(meaning('endurence')).toEqual({ kind: 'correct', close: true })
  })

  it('marks real misses wrong', () => {
    expect(meaning('pride')).toEqual({ kind: 'wrong' })
    expect(meaning('pat')).toEqual({ kind: 'wrong' })
  })

  it('does not grade kana or an empty answer', () => {
    expect(meaning('がまん').kind).toBe('invalid')
    expect(meaning('   ').kind).toBe('invalid')
  })
})

describe('checking readings', () => {
  const reading = (s: string) => checkAnswer('reading', s, word)

  it('accepts the reading in hiragana or katakana, with or without a finished n', () => {
    expect(reading('がまん').kind).toBe('correct')
    expect(reading('がまn').kind).toBe('correct')
    expect(reading('ガマン').kind).toBe('correct')
  })

  it('marks a different reading wrong', () => {
    expect(reading('かまん').kind).toBe('wrong')
  })

  it('does not grade leftover romaji or kanji', () => {
    expect(reading('がmx').kind).toBe('invalid')
    expect(reading('我慢').kind).toBe('invalid')
  })

  it('accepts extra listed readings', () => {
    expect(checkAnswer('reading', 'ひとごと', { ...word, word: '他人事', reading: 'たにんごと', readings: ['ひとごと'] }).kind).toBe('correct')
  })
})

describe('helpers', () => {
  it('normalizes meanings', () => {
    expect(normalizeMeaning("To Put-Up With (someone's)")).toBe('put up with someones')
  })
  it('measures edit distance', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3)
    expect(editDistance('', 'abc')).toBe(3)
  })
})

describe('user synonyms', () => {
  it('accepts your own meanings, with the same typo tolerance', () => {
    expect(checkAnswer('meaning', 'grin and bear it', word).kind).toBe('wrong')
    expect(checkAnswer('meaning', 'grin and bear it', word, ['grin and bear it'])).toEqual({ kind: 'correct', close: false })
    expect(checkAnswer('meaning', 'grin and bare it', word, ['grin and bear it'])).toEqual({ kind: 'correct', close: true })
  })

  it("don't change how readings are checked", () => {
    expect(checkAnswer('reading', 'かまん', word, ['かまん']).kind).toBe('wrong')
  })
})

