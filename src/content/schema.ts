// Shape of the bundled content in src/content/levels/*.json.

export interface Example {
  /** Japanese sentence. `＿` marks where the target word/grammar goes for fill-in questions. */
  ja: string
  /** The sentence with the blank filled in, for reveal/explanations. */
  full: string
  en: string
}

interface ItemBase {
  id: string
  level: number
  /** One-line explanation shown after a wrong answer. */
  note?: string
}

export interface VocabItem extends ItemBase {
  kind: 'vocab'
  /** How the word is normally written. Kana-only words have no kanji and skip reading questions. */
  word: string
  /** Rare kanji spelling of a word normally written in kana (e.g. 寧ろ for むしろ), shown for reference. */
  kanji?: string
  reading: string
  meanings: string[]
  pos: string
  examples: Example[]
  distractors: {
    /** Wrong readings that look plausible (long vowels, small kana, dakuten). */
    readings: string[]
    /** Wrong English meanings. */
    meanings: string[]
    /** Similar-looking or similar-meaning Japanese words. */
    words: string[]
  }
  /** Same-form words that clearly don't fit the example's blank (fill-in-the-blank options). */
  contextWrong: string[]
  /** Kana chunks for the tile builder, e.g. ['しゅ','う','しょ','く']. */
  tiles?: string[]
  tileDecoys?: string[]
  /** Paraphrase question: a word with the closest meaning, plus wrong options. */
  paraphrase?: { sentence: string; answer: string; wrong: string[] }
  /** Usage question: one correct sentence and wrong-usage sentences. */
  usage?: { correct: string; wrong: string[] }
}

export interface GrammarItem extends ItemBase {
  kind: 'grammar'
  pattern: string
  meaning: string
  /** How it attaches, e.g. "V-dictionary + ために". */
  connection: string
  /** Vocab ids used in the examples; the grammar point unlocks once these are learned. */
  requires: string[]
  examples: Example[]
  /** Other patterns in the same confusion group, used as distractors. */
  confusables: string[]
  /** Connection question: base word, correct form, wrong forms. */
  forms?: { base: string; sentence: string; answer: string; wrong: string[] }
  /** ★ sentence-order question. `chunks` is the correct order; star is the index that lands on ★. */
  order?: { before: string; chunks: string[]; star: number; after: string; en: string }
  /** Meaning question: correct translation plus wrong ones. */
  translate?: { sentence: string; answer: string; wrong: string[] }
  /** Error-spotting question: sentence split into chunks, index of the wrong one, and the fix. */
  errorSpot?: { chunks: string[]; wrong: number; fix: string }
  /** Situation question. */
  situation?: { prompt: string; sentence: string; answer: string; wrong: string[] }
}

export type Item = VocabItem | GrammarItem

export interface Level {
  level: number
  items: Item[]
}
