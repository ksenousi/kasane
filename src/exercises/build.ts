import type { Item } from '../content/schema'
import { kanjiDecoys, shuffle, type ExerciseId, type Rng } from '../srs/queue'

/** What sits in the top half of the question screen. */
export type Prompt =
  | { type: 'word'; text: string }
  | { type: 'english'; text: string }
  /** Japanese sentence. `＿` renders as a blank, 【x】 as underlined x. */
  | { type: 'sentence'; text: string }
  /** A reading with its meaning underneath. */
  | { type: 'card'; label: string; text: string }

export interface ChoiceQuestion {
  kind: 'choice'
  ex: ExerciseId
  tag: string
  instruction: string
  prompt: Prompt
  options: string[]
  answer: string
  layout: 'list' | 'grid'
}

export interface TilesQuestion {
  kind: 'tiles'
  ex: 'V3' | 'V4'
  tag: string
  instruction: string
  prompt: Prompt
  tiles: string[]
  answer: string
}

export type Question = ChoiceQuestion | TilesQuestion

function choice(q: Omit<ChoiceQuestion, 'kind' | 'options'>, wrong: string[], rng: Rng): ChoiceQuestion {
  return { kind: 'choice', ...q, options: shuffle([q.answer, ...wrong], rng) }
}

export function buildQuestion(v: Item, ex: ExerciseId, rng: Rng = Math.random): Question {
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
    case 'V4':
      return {
        kind: 'tiles', ex, tag: 'Write the kanji', instruction: 'Build the word from kanji tiles',
        prompt: { type: 'card', label: v.reading, text: v.meanings.slice(0, 2).join('; ') },
        tiles: shuffle([...v.word, ...kanjiDecoys(v)], rng), answer: v.word,
      }
    default:
      throw new Error(`Unknown exercise ${ex}`)
  }
}

/** Text for the "Correct: …" line after a wrong answer. */
export function correctAnswerText(q: Question): string {
  return q.answer
}
