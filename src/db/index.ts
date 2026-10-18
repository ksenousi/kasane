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

// ---- API ------------------------------------------------------------------
// Everything lives on the server (worker/index.ts), behind a passphrase.

/** Thrown when the session cookie is missing or stale; the app shows the sign-in screen. */
export class SignedOut extends Error {
  constructor() {
    super('Signed out')
  }
}

/** Thrown when the server is rate-limiting sign-in attempts. */
export class TooManyTries extends Error {
  constructor() {
    super('Too many tries')
  }
}

async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401) throw new SignedOut()
  if (res.status === 429) throw new TooManyTries()
  if (!res.ok) throw new Error(`${method} ${path} failed (${res.status})`)
  return res.json() as Promise<T>
}

/** Returns false for a wrong passphrase. Throws TooManyTries after too many attempts. */
export async function login(passphrase: string): Promise<boolean> {
  try {
    await api('POST', '/login', { passphrase })
    return true
  } catch (e) {
    if (e instanceof SignedOut) return false
    throw e
  }
}

export async function logout(): Promise<void> {
  await api('POST', '/logout')
}

export interface State {
  progress: Map<string, Progress>
  settings: Settings
  synonyms: Map<string, string[]>
}

/** Loads everything the app needs at start-up in one request. Throws SignedOut if not signed in. */
export async function loadState(): Promise<State> {
  const s = await api<{ progress: Progress[]; settings: SettingRow[]; synonyms: Synonyms[] }>('GET', '/state')
  return {
    progress: new Map(s.progress.map((p) => [p.itemId, p])),
    settings: toSettings(s.settings),
    synonyms: new Map(s.synonyms.map((r) => [r.itemId, r.list])),
  }
}

export async function saveProgress(...rows: Progress[]): Promise<void> {
  await api('PUT', '/progress', rows)
}

/** Saves one word's synonyms; an empty list removes the row. */
export async function saveSynonyms(itemId: string, list: string[]): Promise<void> {
  await api('PUT', `/synonyms/${encodeURIComponent(itemId)}`, { list })
}

export async function recordAnswer(a: Omit<Answer, 'id'>): Promise<void> {
  await api('POST', '/answers', a)
}

export async function loadAnswers(): Promise<Answer[]> {
  return api('GET', '/answers')
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await api('PUT', `/settings/${key}`, { value })
}

function toSettings(rows: SettingRow[]): Settings {
  const s = { ...DEFAULT_SETTINGS } as Record<string, unknown>
  for (const r of rows) s[r.key] = r.value
  return s as unknown as Settings
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
  const rows = await api<Omit<Backup, 'app' | 'version' | 'exportedAt'>>('GET', '/backup')
  return { app: 'kasane', version: 1, exportedAt: now, ...rows }
}

/** Replaces all saved data with the backup. Throws if the file isn't a Kasane backup. */
export async function importBackup(data: unknown): Promise<void> {
  const b = data as Partial<Backup> | null
  if (!b || b.app !== 'kasane' || b.version !== 1 || !Array.isArray(b.progress) || !Array.isArray(b.answers)) {
    throw new Error('Not a Kasane backup file')
  }
  await api('PUT', '/backup', { progress: b.progress, answers: b.answers, settings: b.settings ?? [], synonyms: b.synonyms ?? [] })
}

export async function resetAll(): Promise<void> {
  await api('DELETE', '/data')
}
