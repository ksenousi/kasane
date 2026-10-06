import kanjiMeanings from './kanji.json'
import type { Item, Level } from './schema'

// Every src/content/levels/level-NN.json, in level order.
const files = import.meta.glob<Level>('./levels/level-*.json', { eager: true, import: 'default' })
export const LEVELS: Level[] = Object.keys(files).sort().map((k) => files[k])

export const ITEMS: Item[] = LEVELS.flatMap((l) => l.items)

export const ITEMS_BY_ID: ReadonlyMap<string, Item> = new Map(ITEMS.map((i) => [i.id, i]))

/** True when the word contains kanji, so it can be asked about its reading. */
export function hasKanji(word: string): boolean {
  return /[\u4e00-\u9fff]/.test(word)
}

export function itemLabel(item: Item): string {
  return item.word
}

const KANJI: Readonly<Record<string, string>> = kanjiMeanings

/**
 * Each distinct kanji in a word with its meaning on its own, for words with two or more kanji
 * (a single-kanji word's meaning already is the kanji's). Empty otherwise.
 */
export function kanjiBreakdown(word: string): { kanji: string; meaning: string | undefined }[] {
  const chars = [...new Set(word.match(/[\u4e00-\u9fff]/g) ?? [])]
  return chars.length >= 2 ? chars.map((k) => ({ kanji: k, meaning: KANJI[k] })) : []
}
