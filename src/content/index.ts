import type { Item, Level } from './schema'
import level01 from './levels/level-01.json'

export const LEVELS: Level[] = [level01 as Level]

export const ITEMS: Item[] = LEVELS.flatMap((l) => l.items)

export const ITEMS_BY_ID: ReadonlyMap<string, Item> = new Map(ITEMS.map((i) => [i.id, i]))

export function itemLabel(item: Item): string {
  return item.kind === 'vocab' ? item.word : item.pattern
}
