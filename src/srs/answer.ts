import { isJapanese, toHiragana, toKana } from 'wanakana'
import type { Item } from '../content/schema'
import type { Part } from './queue'

/**
 * Checking typed answers, WaniKani-style. A typo-level miss on a meaning still counts,
 * and answering in the wrong script (kana for a meaning, English for a reading)
 * isn't graded: the input shakes and you try again.
 */
export type Verdict =
  | { kind: 'correct'; close: boolean }
  | { kind: 'wrong' }
  /** Not graded: empty, or the wrong kind of answer for the prompt. */
  | { kind: 'invalid'; message: string }

/** Live romaji → kana while typing. A trailing "n" stays Latin until the next key decides it. */
export function imeKana(raw: string): string {
  return toKana(raw.toLowerCase(), { IMEMode: true })
}

/** Final kana form of a reading answer: finishes a trailing "n" and folds katakana into hiragana. */
export function finishKana(s: string): string {
  return toHiragana(s.trim().replace(/nn$/, 'n')).replace(/[\s　]/g, '')
}

const FILLER = /^(to|a|an|the)\s+/

/** Lowercase, drop punctuation and leading "to"/"a"/"the", squash spaces. */
export function normalizeMeaning(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(FILLER, '')
}

/**
 * Every accepted spelling of an item's meaning, including the version without (parenthesised) parts.
 * `synonyms` are the user's own extra meanings, like WaniKani's user synonyms.
 */
export function acceptedMeanings(item: Item, synonyms: readonly string[] = []): string[] {
  const all = [...item.meanings, ...(item.accept ?? []), ...synonyms]
  const forms = all.flatMap((m) => [m, m.replace(/\([^)]*\)/g, ' ')])
  return [...new Set(forms.map(normalizeMeaning).filter(Boolean))]
}

/** Edits allowed for a typo, by answer length (close to WaniKani's tolerance). */
export function typoTolerance(len: number): number {
  if (len <= 3) return 0
  if (len <= 5) return 1
  if (len <= 7) return 2
  return 2 + Math.floor((len - 7) / 7)
}

export function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diag = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const up = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = up
    }
  }
  return row[b.length]
}

function checkMeaning(input: string, item: Item, synonyms: readonly string[]): Verdict {
  if (isJapanese(input.replace(/\s/g, '')) || /[぀-ヿ一-鿿]/.test(input)) {
    return { kind: 'invalid', message: 'We want the meaning in English, not the reading.' }
  }
  const given = normalizeMeaning(input)
  if (!given) return { kind: 'invalid', message: 'Type a meaning in English.' }
  const accepted = acceptedMeanings(item, synonyms)
  if (accepted.includes(given)) return { kind: 'correct', close: false }
  if (accepted.some((m) => editDistance(given, m) <= typoTolerance(m.length))) return { kind: 'correct', close: true }
  return { kind: 'wrong' }
}

function checkReading(input: string, item: Item): Verdict {
  const given = finishKana(input)
  if (!given) return { kind: 'invalid', message: 'Type the reading in kana (romaji turns into kana).' }
  if (/[a-z]/i.test(given)) return { kind: 'invalid', message: 'That doesn’t spell a reading. Check the romaji.' }
  if (/[一-鿿]/.test(given)) return { kind: 'invalid', message: 'We want the reading in kana, not kanji.' }
  const readings = [item.reading, ...(item.readings ?? [])].map((r) => toHiragana(r))
  return readings.includes(given) ? { kind: 'correct', close: false } : { kind: 'wrong' }
}

export function checkAnswer(part: Part, input: string, item: Item, synonyms: readonly string[] = []): Verdict {
  return part === 'meaning' ? checkMeaning(input, item, synonyms) : checkReading(input, item)
}
