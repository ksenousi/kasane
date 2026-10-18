/**
 * Kasane's backend: serves the built app and a small JSON API backed by D1.
 * There is one user, who signs in with the PASSPHRASE secret; the session
 * cookie is an HMAC of it, so changing the passphrase signs every device out.
 */

export interface Env {
  DB: D1Database
  PASSPHRASE: string
  ASSETS: Fetcher
  LOGIN_PER_IP: RateLimit
  LOGIN_TOTAL: RateLimit
}

const COOKIE = 'kasane_session'
const YEAR = 60 * 60 * 24 * 365
/** Rows per INSERT. Each batch goes in as one JSON string, which D1 caps at 2 MB. */
const CHUNK = 500

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req)
    try {
      return await api(req, url.pathname.slice('/api'.length), env)
    } catch (e) {
      console.error(e)
      return json({ error: 'Server error' }, 500)
    }
  },
} satisfies ExportedHandler<Env>

async function api(req: Request, path: string, env: Env): Promise<Response> {
  const m = req.method

  if (m === 'POST' && path === '/login') {
    // Slow down passphrase guessing. Devices already signed in aren't affected.
    const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown'
    const [perIp, total] = await Promise.all([env.LOGIN_PER_IP.limit({ key: ip }), env.LOGIN_TOTAL.limit({ key: 'all' })])
    if (!perIp.success || !total.success) return json({ error: 'Too many tries' }, 429)
    const { passphrase } = await req.json<{ passphrase?: unknown }>()
    if (typeof passphrase !== 'string' || !env.PASSPHRASE || !same(await token(passphrase), await token(env.PASSPHRASE))) {
      return json({ error: 'Wrong passphrase' }, 401)
    }
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(await token(env.PASSPHRASE), YEAR) })
  }
  if (m === 'POST' && path === '/logout') return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) })

  if (!env.PASSPHRASE || !same(readCookie(req) ?? '', await token(env.PASSPHRASE))) return json({ error: 'Signed out' }, 401)

  const db = env.DB

  if (m === 'GET' && path === '/state') return json(await readState(db))

  if (m === 'GET' && path === '/answers') return json(await allAnswers(db))

  if (m === 'PUT' && path === '/progress') {
    await db.batch(putProgress(db, await req.json<unknown[]>()))
    return ok()
  }

  if (m === 'POST' && path === '/answers') {
    const { id: _, ...a } = await req.json<Record<string, unknown>>()
    await db.prepare('INSERT INTO answers (data) VALUES (?)').bind(JSON.stringify(a)).run()
    return ok()
  }

  const setting = path.match(/^\/settings\/([\w-]+)$/)
  if (m === 'PUT' && setting) {
    const { value } = await req.json<{ value: unknown }>()
    await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(setting[1], JSON.stringify(value)).run()
    return ok()
  }

  const syn = path.match(/^\/synonyms\/(.+)$/)
  if (m === 'PUT' && syn) {
    const itemId = decodeURIComponent(syn[1])
    const { list } = await req.json<{ list: string[] }>()
    await (list.length
      ? db.prepare('INSERT OR REPLACE INTO synonyms (item_id, list) VALUES (?, ?)').bind(itemId, JSON.stringify(list))
      : db.prepare('DELETE FROM synonyms WHERE item_id = ?').bind(itemId)
    ).run()
    return ok()
  }

  if (m === 'GET' && path === '/backup') return json({ ...(await readState(db)), answers: await allAnswers(db) })

  // Replace everything with a backup's rows (the client has already checked it's a Kasane backup).
  if (m === 'PUT' && path === '/backup') {
    const b = await req.json<{ progress: unknown[]; answers: unknown[]; settings?: { key: string; value: unknown }[]; synonyms?: { itemId: string; list: string[] }[] }>()
    await db.batch([
      ...wipe(db),
      ...putProgress(db, b.progress),
      ...chunks(b.answers.map(({ id: _, ...a }: any) => a)).map((rows) =>
        db.prepare('INSERT INTO answers (data) SELECT value FROM json_each(?)').bind(JSON.stringify(rows)),
      ),
      ...(b.settings ?? []).map((s) => db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(s.key, JSON.stringify(s.value))),
      ...chunks(b.synonyms ?? []).map((rows) =>
        db
          .prepare("INSERT OR REPLACE INTO synonyms (item_id, list) SELECT json_extract(value, '$.itemId'), json_extract(value, '$.list') FROM json_each(?)")
          .bind(JSON.stringify(rows)),
      ),
    ])
    return ok()
  }

  if (m === 'DELETE' && path === '/data') {
    await db.batch(wipe(db))
    return ok()
  }

  return json({ error: 'Not found' }, 404)
}

/** Everything the app loads at start-up: progress, settings and synonyms (answers are fetched separately). */
async function readState(db: D1Database) {
  const [progress, settings, synonyms] = await db.batch([
    db.prepare('SELECT data FROM progress'),
    db.prepare('SELECT key, value FROM settings'),
    db.prepare('SELECT item_id, list FROM synonyms'),
  ])
  return {
    progress: (progress.results as { data: string }[]).map((r) => JSON.parse(r.data)),
    settings: (settings.results as { key: string; value: string }[]).map((r) => ({ key: r.key, value: JSON.parse(r.value) })),
    synonyms: (synonyms.results as { item_id: string; list: string }[]).map((r) => ({ itemId: r.item_id, list: JSON.parse(r.list) })),
  }
}

function putProgress(db: D1Database, rows: unknown[]): D1PreparedStatement[] {
  return chunks(rows).map((c) =>
    db.prepare("INSERT OR REPLACE INTO progress (item_id, data) SELECT json_extract(value, '$.itemId'), value FROM json_each(?)").bind(JSON.stringify(c)),
  )
}

async function allAnswers(db: D1Database): Promise<unknown[]> {
  const { results } = await db.prepare('SELECT id, data FROM answers ORDER BY id').all<{ id: number; data: string }>()
  return results.map((r) => ({ ...JSON.parse(r.data), id: r.id }))
}

function wipe(db: D1Database): D1PreparedStatement[] {
  return ['progress', 'answers', 'settings', 'synonyms'].map((t) => db.prepare(`DELETE FROM ${t}`))
}

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK))
  return out
}

async function token(passphrase: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('kasane-session-v1'))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Compares without stopping at the first difference, so response time doesn't reveal how much of a guess matched. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function cookie(value: string, maxAge: number): string {
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`
}

function readCookie(req: Request): string | undefined {
  const header = req.headers.get('Cookie') ?? ''
  return header.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } })
}

function ok(): Response {
  return json({ ok: true })
}
