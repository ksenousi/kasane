import Dexie, { type EntityTable } from 'dexie'
import type { Progress } from '../srs/engine'
import type { Part } from '../srs/queue'

/** One answered question, kept for accuracy stats (Weak spots). */
export interface Answer {
  id?: number
  itemId: string
  part: Part
  correct: boolean
  /** What was typed, for spotting which wrong answers catch you out. */
  given?: string
  /** Session type the answer came from. */
  mode?: 'review' | 'quiz' | 'drill'
  at: number
}

export interface Settings {
  lessonBatch: number
}

export const DEFAULT_SETTINGS: Settings = { lessonBatch: 5 }

interface SettingRow {
  key: keyof Settings
  value: Settings[keyof Settings]
}

/** The user's own extra meanings for one word (WaniKani's "user synonyms"). */
export interface Synonyms {
  itemId: string
  list: string[]
}

export class KasaneDB extends Dexie {
  progress!: EntityTable<Progress, 'itemId'>
  answers!: EntityTable<Answer, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  synonyms!: EntityTable<Synonyms, 'itemId'>

  constructor(name = 'kasane') {
    super(name)
    this.version(1).stores({
      progress: 'itemId, stage, dueAt',
      answers: '++id, itemId, exercise, at',
      settings: 'key',
    })
    // v2: typed answers replace multiple choice and grammar is gone. Start everyone from scratch.
    this.version(2)
      .stores({ answers: '++id, itemId, part, at' })
      .upgrade(async (tx) => {
        await tx.table('progress').clear()
        await tx.table('answers').clear()
      })
    // v3: user synonyms. Adds a table only; progress is kept.
    this.version(3).stores({ synonyms: 'itemId' })
  }
}

export const db = new KasaneDB()

export async function loadProgress(): Promise<Map<string, Progress>> {
  const rows = await db.progress.toArray()
  return new Map(rows.map((p) => [p.itemId, p]))
}

export async function saveProgress(...rows: Progress[]): Promise<void> {
  await db.progress.bulkPut(rows)
}

export async function loadSynonyms(): Promise<Map<string, string[]>> {
  const rows = await db.synonyms.toArray()
  return new Map(rows.map((r) => [r.itemId, r.list]))
}

/** Saves one word's synonyms; an empty list removes the row. */
export async function saveSynonyms(itemId: string, list: string[]): Promise<void> {
  if (list.length) await db.synonyms.put({ itemId, list })
  else await db.synonyms.delete(itemId)
}

export async function recordAnswer(a: Omit<Answer, 'id'>): Promise<void> {
  await db.answers.add(a)
}

export async function loadSettings(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const s = { ...DEFAULT_SETTINGS } as Record<string, unknown>
  for (const r of rows) s[r.key] = r.value
  return s as unknown as Settings
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value })
}

// ---- Backup ---------------------------------------------------------------

export interface Backup {
  app: 'kasane'
  version: 1
  exportedAt: number
  progress: Progress[]
  answers: Answer[]
  settings: SettingRow[]
  /** Added later; older backups don't have it. */
  synonyms?: Synonyms[]
}

export async function exportBackup(now = Date.now()): Promise<Backup> {
  return {
    app: 'kasane',
    version: 1,
    exportedAt: now,
    progress: await db.progress.toArray(),
    answers: await db.answers.toArray(),
    settings: await db.settings.toArray(),
    synonyms: await db.synonyms.toArray(),
  }
}

/** Replaces all local data with the backup. Throws if the file isn't a Kasane backup. */
export async function importBackup(data: unknown): Promise<void> {
  const b = data as Partial<Backup> | null
  if (!b || b.app !== 'kasane' || b.version !== 1 || !Array.isArray(b.progress) || !Array.isArray(b.answers)) {
    throw new Error('Not a Kasane backup file')
  }
  await db.transaction('rw', [db.progress, db.answers, db.settings, db.synonyms], async () => {
    await Promise.all([db.progress.clear(), db.answers.clear(), db.settings.clear(), db.synonyms.clear()])
    await db.progress.bulkPut(b.progress!)
    await db.answers.bulkPut(b.answers!)
    await db.settings.bulkPut(b.settings ?? [])
    await db.synonyms.bulkPut(b.synonyms ?? [])
  })
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', [db.progress, db.answers, db.settings, db.synonyms], async () => {
    await Promise.all([db.progress.clear(), db.answers.clear(), db.settings.clear(), db.synonyms.clear()])
  })
}
