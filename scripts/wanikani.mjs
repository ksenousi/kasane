// Pulls your WaniKani vocabulary progress so Kasane can skip words you already know there.
// Usage: WANIKANI_API_KEY=... node scripts/wanikani.mjs
// Writes content/source/wanikani-known.json. The key is only read from the environment, never saved.
import { writeFileSync } from 'node:fs'

const KEY = process.env.WANIKANI_API_KEY
if (!KEY) {
  console.error('Set WANIKANI_API_KEY (a read-only token).')
  process.exit(1)
}

const headers = { Authorization: `Bearer ${KEY}`, 'Wanikani-Revision': '20170710' }

async function all(url) {
  const out = []
  while (url) {
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.split('?')[0]}`)
    const body = await res.json()
    out.push(...body.data)
    url = body.pages?.next_url ?? null
  }
  return out
}

const TYPES = 'vocabulary,kana_vocabulary'
const [assignments, subjects] = await Promise.all([
  all(`https://api.wanikani.com/v2/assignments?subject_types=${TYPES}&started=true`),
  all(`https://api.wanikani.com/v2/subjects?types=${TYPES}`),
])

const byId = new Map(subjects.map((s) => [s.id, s.data]))
const words = assignments
  .map((a) => {
    const s = byId.get(a.data.subject_id)
    if (!s) return null
    return {
      word: s.characters,
      readings: (s.readings ?? []).map((r) => r.reading),
      wkLevel: s.level,
      srsStage: a.data.srs_stage,
      passed: a.data.passed_at !== null,
    }
  })
  .filter(Boolean)
  .sort((a, b) => a.wkLevel - b.wkLevel || a.word.localeCompare(b.word))

writeFileSync(
  'content/source/wanikani-known.json',
  JSON.stringify({ fetchedAt: new Date().toISOString().slice(0, 10), words }, null, 1) + '\n',
)
const passed = words.filter((w) => w.passed).length
console.log(`${words.length} started WaniKani vocab (${passed} passed Guru) out of ${subjects.length} vocab subjects`)
