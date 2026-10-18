/**
 * Runs the real Worker (worker/index.ts) in-process for tests: D1 is faked with
 * node:sqlite plus the migrations, and global fetch is pointed at the Worker
 * with a one-cookie jar standing in for the browser.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

// Loaded by a non-literal path so this project's (DOM) type-check doesn't pull in the
// Worker's runtime types; worker/tsconfig.json checks that file.
const WORKER = '../worker/index'
const worker = (await import(/* @vite-ignore */ WORKER)).default as { fetch(req: Request, env: unknown): Promise<Response> }

export const PASSPHRASE = 'test passphrase'

class Stmt {
  private args: SQLInputValue[] = []
  constructor(private db: DatabaseSync, private sql: string) {}
  bind(...args: SQLInputValue[]) {
    const s = new Stmt(this.db, this.sql)
    s.args = args
    return s
  }
  async all() {
    return { results: this.exec(), success: true }
  }
  async run() {
    return this.all()
  }
  async first() {
    return this.exec()[0] ?? null
  }
  exec() {
    return this.db.prepare(this.sql).all(...this.args)
  }
}

function fakeD1() {
  const db = new DatabaseSync(':memory:')
  const dir = fileURLToPath(new URL('../migrations/', import.meta.url))
  for (const f of readdirSync(dir).sort()) db.exec(readFileSync(`${dir}/${f}`, 'utf8'))
  return {
    prepare: (sql: string) => new Stmt(db, sql),
    // Like D1, a batch is one transaction.
    batch: async (stmts: Stmt[]) => {
      db.exec('BEGIN')
      try {
        const out = stmts.map((s) => ({ results: s.exec(), success: true }))
        db.exec('COMMIT')
        return out
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
  }
}

/** Installs a fresh database and fetch shim. Signed in unless `signedIn` is false. */
export async function useApi({ signedIn = true } = {}): Promise<void> {
  const env = { DB: fakeD1(), PASSPHRASE, ASSETS: { fetch: async () => new Response('app') } }
  let jar = ''
  globalThis.fetch = (async (input: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    if (jar) headers.set('Cookie', jar)
    const res = await worker.fetch(new Request(new URL(input, 'https://kasane.test'), { ...init, headers }), env)
    const set = res.headers.get('Set-Cookie')
    if (set) jar = /Max-Age=0/.test(set) ? '' : set.split(';')[0]
    return res
  }) as typeof fetch
  if (signedIn) await fetch('/api/login', { method: 'POST', body: JSON.stringify({ passphrase: PASSPHRASE }) })
}
