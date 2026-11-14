// Writes ios/Shared/words.json: every vocab word in a fixed shuffled order, trimmed to what
// the lock screen widget shows. Run after changing content: `npm run widget:words`.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const dir = new URL('../src/content/levels/', import.meta.url)
const items = readdirSync(dir)
  .filter((f) => /^level-\d+\.json$/.test(f))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')).items)

const words = items.map((i) => {
  // The shortest example is the one most likely to fit on one lock screen line.
  const ex = [...i.examples].sort((a, b) => [...a.ja].length - [...b.ja].length)[0]
  return { id: i.id, word: i.word, reading: i.reading, meaning: i.meanings[0], example: ex?.ja ?? '' }
})

// Seeded Fisher–Yates so the order is mixed across levels but stable between runs.
let seed = 0x6b617361
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
for (let i = words.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1))
  ;[words[i], words[j]] = [words[j], words[i]]
}

const out = new URL('../ios/Shared/words.json', import.meta.url)
writeFileSync(out, JSON.stringify(words, null, 0).replace(/\},\{/g, '},\n{') + '\n')
console.log(`Wrote ${words.length} words to ios/Shared/words.json`)
