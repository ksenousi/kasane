// Shape of the bundled content in src/content/levels/*.json.

export interface Example {
  /** Japanese sentence. `＿` marks where the target word goes for fill-in questions. */
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
  /**
   * Memory hooks shown in lessons and after a miss. `meaning` ties the meaning to the kanji
   * (or the sound, for kana words); `reading` is for words written with kanji.
   */
  mnemonic?: { meaning: string; reading?: string }
}

export interface VocabItem extends ItemBase {
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

export type Item = VocabItem

export interface Level {
  level: number
  items: Item[]
}
