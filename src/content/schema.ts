// Shape of the bundled content in src/content/levels/*.json.

export interface Example {
  ja: string
  en: string
}

export interface VocabItem {
  id: string
  level: number
  /** How the word is normally written. Kana-only words have no kanji and skip the reading prompt. */
  word: string
  /** Rare kanji spelling of a word normally written in kana (e.g. 寧ろ for むしろ), shown for reference. */
  kanji?: string
  reading: string
  /** Other readings that also count as correct. */
  readings?: string[]
  /** Shown meanings; the first is the main one. All count as correct answers. */
  meanings: string[]
  /** Extra answers that count as correct but aren't shown (synonyms, British/American spellings). */
  accept?: string[]
  pos: string
  /**
   * Memory hooks shown in lessons and after a miss. `meaning` ties the meaning to the kanji
   * (or the sound, for kana words); `reading` is for words written with kanji.
   */
  mnemonic: { meaning: string; reading?: string }
  examples: Example[]
  /** Usage note, e.g. a look-alike word not to mix it up with. */
  note?: string
}

export type Item = VocabItem

export interface Level {
  level: number
  items: Item[]
}
