import { useMemo, useState, type ReactNode } from 'react'
import grammar from '../content/grammar.json'
import ui from '../ui/ui.module.css'
import s from './Grammar.module.css'

/** Reference sheet for the 91 core N3 grammar points. Not part of the SRS. */
interface Point {
  pattern: string
  meaning: string
  connection: string
  note: string
  /** Japanese uses 漢字[かな] for furigana and {…} for the highlighted grammar. */
  examples: { ja: string; en: string }[]
}

interface Group {
  id: string
  name: string
  sub: string
  points: Point[]
}

const GROUPS: Group[] = grammar

const RUBY = /([一-鿿々]+)\[([^\]]+)\]/g

/** Kanji with furigana above. */
function Ruby({ text }: { text: string }) {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(RUBY)) {
    out.push(text.slice(last, m.index))
    out.push(<ruby key={m.index}>{m[1]}<rt>{m[2]}</rt></ruby>)
    last = m.index! + m[0].length
  }
  out.push(text.slice(last))
  return <>{out}</>
}

/** A Japanese line: furigana, with the grammar in {…} highlighted. */
function Ja({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{[^}]*\})/).map((part, i) =>
        part.startsWith('{') ? <mark key={i} className={s.mark}><Ruby text={part.slice(1, -1)} /></mark> : <Ruby key={i} text={part} />,
      )}
    </>
  )
}

/** Plain text for searching: kanji without readings, plus the readings on their own. */
const plain = (t: string) => `${t.replace(/\[[^\]]*\]|[{}]/g, '')} ${t.replace(RUBY, '$2').replace(/[{}]/g, '')}`

function load(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

function save(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    // Private mode: the toggle just won't be remembered.
  }
}

export default function Grammar() {
  const [query, setQuery] = useState('')
  const [furigana, setFurigana] = useState(() => load('grammar.furigana', true))
  const [hideEn, setHideEn] = useState(() => load('grammar.hideEn', false))
  const [shown, setShown] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return GROUPS
    return GROUPS.map((g) => ({
      ...g,
      points: g.points.filter((p) =>
        plain([p.pattern, p.meaning, p.connection, p.note, ...p.examples.flatMap((e) => [e.ja, e.en])].join(' ')).toLowerCase().includes(q),
      ),
    })).filter((g) => g.points.length)
  }, [query])

  const total = GROUPS.reduce((n, g) => n + g.points.length, 0)
  const toggle = (key: string) => setShown((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  return (
    <div className={`${s.page} ${furigana ? '' : s.noFuri}`}>
      <div className={s.head}>
        <span className={ui.label}>N3 · {total} core points</span>
        <span className={s.title}>Grammar</span>
      </div>

      <div className={s.bar}>
        <input
          className={s.search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: ために, even if…"
          aria-label="Search grammar"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <div className={s.toggles}>
          <button className={`${s.toggle} ${furigana ? s.on : ''}`} aria-pressed={furigana} onClick={() => { setFurigana(!furigana); save('grammar.furigana', !furigana) }}>Furigana</button>
          <button className={`${s.toggle} ${hideEn ? s.on : ''}`} aria-pressed={hideEn} onClick={() => { setHideEn(!hideEn); save('grammar.hideEn', !hideEn); setShown(new Set()) }}>Hide English</button>
        </div>
        <nav className={s.chips} aria-label="Groups">
          {groups.map((g) => (
            <a key={g.id} href={`#g-${g.id}`} className={s.chip} onClick={(e) => { e.preventDefault(); document.getElementById(`g-${g.id}`)?.scrollIntoView({ behavior: 'smooth' }) }}>
              {g.name}<b>{g.points.length}</b>
            </a>
          ))}
        </nav>
      </div>

      {groups.length === 0 && <p className={s.empty}>Nothing matches “{query}”. Try a pattern like ために or an English word like “even”.</p>}

      {groups.map((g) => (
        <section key={g.id} id={`g-${g.id}`} className={s.group}>
          <h2 className={s.groupName}>{g.name}</h2>
          <p className={s.sub}>{g.sub}</p>
          <div className={s.cards}>
            {g.points.map((p) => (
              <article key={p.pattern} className={`${ui.card} ${s.card}`}>
                <div className={s.cardHead}>
                  <span className={s.pattern} lang="ja"><Ruby text={p.pattern} /></span>
                  <span className={s.meaning}>{p.meaning}</span>
                </div>
                <span className={s.connection} lang="ja"><Ruby text={p.connection} /></span>
                <p className={s.note}>{p.note}</p>
                <ul className={s.examples}>
                  {p.examples.map((e) => {
                    const key = `${p.pattern}|${e.ja}`
                    const hidden = hideEn && !shown.has(key)
                    return (
                      <li key={e.ja}>
                        <span className={s.ja} lang="ja"><Ja text={e.ja} /></span>
                        {hideEn ? (
                          <button className={`${s.en} ${hidden ? s.blur : ''}`} onClick={() => toggle(key)} aria-label={hidden ? 'Show translation' : undefined}>{e.en}</button>
                        ) : (
                          <span className={s.en}>{e.en}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
