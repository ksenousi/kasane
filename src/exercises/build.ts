import type { GrammarItem, Item, VocabItem } from '../content/schema'
import { shuffle, type ExerciseId, type Rng } from '../srs/queue'

/** What sits in the top half of the question screen. */
export type Prompt =
  | { type: 'word'; text: string }
  | { type: 'english'; text: string }
  /** Japanese sentence. `＿` renders as a blank, 【x】 as underlined x. */
  | { type: 'sentence'; text: string }
  /** A labelled card (grammar pattern or situation) with an optional sentence under it. */
  | { type: 'card'; label: string; text: string; sentence?: string }

export interface ChoiceQuestion {
  kind: 'choice'
  ex: ExerciseId
  tag: string
  instruction: string
  prompt: Prompt
  options: string[]
  answer: string
  layout: 'list' | 'grid' | 'chips'
}

export interface TilesQuestion {
  kind: 'tiles'
  ex: 'V3'
  tag: string
  instruction: string
  prompt: Prompt
  tiles: string[]
  answer: string
}

export interface OrderQuestion {
  kind: 'order'
  ex: 'G2'
  tag: string
  instruction: string
  before: string
  after: string
  /** Shuffled chunks to place. */
  pool: string[]
  correct: string[]
  star: number
  en: string
}

export type Question = ChoiceQuestion | TilesQuestion | OrderQuestion

const bare = (pattern: string) => pattern.replace(/^〜/, '')

function choice(q: Omit<ChoiceQuestion, 'kind' | 'options'>, wrong: string[], rng: Rng): ChoiceQuestion {
  return { kind: 'choice', ...q, options: shuffle([q.answer, ...wrong], rng) }
}

function vocabQuestion(v: VocabItem, ex: ExerciseId, rng: Rng): Question {
  const ex0 = v.examples[0]
  switch (ex) {
    case 'V1':
      return choice({ ex, tag: 'Meaning', instruction: 'What does it mean?', prompt: { type: 'word', text: v.word }, answer: v.meanings[0], layout: 'list' }, v.distractors.meanings, rng)
    case 'V2':
      return choice({ ex, tag: 'English → Japanese', instruction: 'Pick the Japanese word', prompt: { type: 'english', text: v.meanings.slice(0, 2).join('; ') }, answer: v.word, layout: 'grid' }, v.distractors.words, rng)
    case 'V10': {
      const prompt: Prompt = ex0 ? { type: 'sentence', text: ex0.full.replace(v.word, `【${v.word}】`) } : { type: 'word', text: v.word }
      const instruction = ex0 ? 'How is the underlined word read?' : 'How is it read?'
      return choice({ ex, tag: 'Reading', instruction, prompt, answer: v.reading, layout: 'grid' }, v.distractors.readings, rng)
    }
    case 'V5': {
      const e = v.examples.find((x) => x.ja.includes('＿'))!
      return choice({ ex, tag: 'Fill the blank', instruction: 'Which word fits the blank?', prompt: { type: 'sentence', text: e.ja }, answer: v.word, layout: 'list' }, v.contextWrong, rng)
    }
    case 'V6': {
      const p = v.paraphrase!
      return choice({ ex, tag: 'Same meaning', instruction: 'Closest in meaning to the underlined word', prompt: { type: 'sentence', text: p.sentence }, answer: p.answer, layout: 'list' }, p.wrong, rng)
    }
    case 'V7': {
      const u = v.usage!
      return choice({ ex, tag: 'Usage', instruction: 'Which sentence uses it correctly?', prompt: { type: 'word', text: v.word }, answer: u.correct, layout: 'list' }, u.wrong, rng)
    }
    case 'V3':
      return {
        kind: 'tiles', ex, tag: 'Build the reading', instruction: 'Tap the tiles to spell the reading',
        prompt: { type: 'word', text: v.word }, tiles: shuffle([...v.tiles!, ...(v.tileDecoys ?? [])], rng), answer: v.reading,
      }
    default:
      throw new Error(`${ex} is not a vocab exercise`)
  }
}

function grammarQuestion(g: GrammarItem, ex: ExerciseId, rng: Rng): Question {
  switch (ex) {
    case 'G1': {
      const e = g.examples.find((x) => x.ja.includes('＿'))!
      return choice({ ex, tag: 'Fill the blank', instruction: 'Which grammar fits?', prompt: { type: 'sentence', text: e.ja }, answer: bare(g.pattern), layout: 'grid' }, g.confusables.slice(0, 3).map(bare), rng)
    }
    case 'G3': {
      const f = g.forms!
      return choice({ ex, tag: 'Connection', instruction: `Which form of ${f.base} connects correctly?`, prompt: { type: 'card', label: g.pattern, text: g.meaning, sentence: f.sentence }, answer: f.answer, layout: 'grid' }, f.wrong, rng)
    }
    case 'G6': {
      const t = g.translate!
      return choice({ ex, tag: 'Meaning', instruction: 'What does this sentence mean?', prompt: { type: 'sentence', text: t.sentence }, answer: t.answer, layout: 'list' }, t.wrong, rng)
    }
    case 'G5': {
      const e = g.errorSpot!
      return { kind: 'choice', ex, tag: 'Spot the error', instruction: 'One piece is wrong. Tap it.', prompt: { type: 'english', text: '' }, options: e.chunks, answer: e.chunks[e.wrong], layout: 'chips' }
    }
    case 'G7': {
      const s = g.situation!
      return choice({ ex, tag: 'Situation', instruction: 'What do you say?', prompt: { type: 'card', label: 'Situation', text: s.prompt, sentence: s.sentence }, answer: s.answer, layout: 'list' }, s.wrong, rng)
    }
    case 'G2': {
      const o = g.order!
      return {
        kind: 'order', ex, tag: 'Sentence order ★', instruction: 'Tap the pieces into order. Which one lands on ★?',
        before: o.before, after: o.after, pool: shuffle(o.chunks, rng), correct: o.chunks, star: o.star, en: o.en,
      }
    }
    default:
      throw new Error(`${ex} is not a grammar exercise`)
  }
}

export function buildQuestion(item: Item, ex: ExerciseId, rng: Rng = Math.random): Question {
  return item.kind === 'vocab' ? vocabQuestion(item, ex, rng) : grammarQuestion(item, ex, rng)
}

/** Text for the "Correct: …" line after a wrong answer. */
export function correctAnswerText(q: Question): string {
  if (q.kind === 'order') return q.correct.join(' → ')
  return q.answer
}
