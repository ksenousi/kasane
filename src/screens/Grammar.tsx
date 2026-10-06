import { useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../state/store'
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
  /** Sentences containing it per 10,000 in the Tatoeba corpus (content/source/grammar-frequency.json). */
  freq: number
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

type Show = 'all' | 'unknown' | 'known'
type Sort = 'theme' | 'common' | 'rare' | 'kana'

const SORT_LABEL: Record<Sort, string> = { theme: 'Theme', common: 'Most common', rare: 'Least common', kana: 'あいうえお' }

/** How common a point is, in words, from its corpus frequency. */
function tier(freq: number): string {
  if (freq >= 20) return 'Very common'
  if (freq >= 5) return 'Common'
  if (freq >= 1.5) return 'Less common'
  return 'Rare'
}

/** Sort key for あいうえお order: the pattern's reading, without 〜 and brackets. */
const kanaKey = (pattern: string) => pattern.replace(RUBY, (_, _k, r: string) => r.split('・')[0]).replace(/[〜（）()]/g, '')

function loadSort(): Sort {
  try {
    const v = localStorage.getItem('grammar.sort')
    return v === 'common' || v === 'rare' || v === 'kana' ? v : 'theme'
  } catch {
    return 'theme'
  }
}

function loadShow(): Show {
  try {
    const v = localStorage.getItem('grammar.show')
    if (v === 'all' || v === 'unknown' || v === 'known') return v
    // Before this filter there was a "Hide known" toggle (on by default).
    return localStorage.getItem('grammar.hideKnown') === '0' ? 'all' : 'unknown'
  } catch {
    return 'unknown'
  }
}

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
  const { settings, toggleKnownGrammar } = useStore()
  const known = useMemo(() => new Set(settings.knownGrammar), [settings.knownGrammar])
  const [show, setShow] = useState<Show>(loadShow)
  const [sort, setSort] = useState<Sort>(loadSort)
  const pickSort = (v: Sort) => {
    setSort(v)
    window.scrollTo(0, 0)
    try {
      localStorage.setItem('grammar.sort', v)
    } catch {
      // Private mode: the choice just won't be remembered.
    }
  }
  const pickShow = (v: Show) => {
    setShow(v)
    try {
      localStorage.setItem('grammar.show', v)
    } catch {
      // Private mode: the choice just won't be remembered.
    }
  }
  const [query, setQuery] = useState('')
  const [furigana, setFurigana] = useState(() => load('grammar.furigana', true))
  const [hideEn, setHideEn] = useState(() => load('grammar.hideEn', false))
  const [shown, setShown] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (p: Point) =>
      !q || plain([p.pattern, p.meaning, p.connection, p.note, ...p.examples.flatMap((e) => [e.ja, e.en])].join(' ')).toLowerCase().includes(q)
    const wanted = (p: Point) => show === 'all' || (show === 'known') === known.has(p.pattern)
    const byTheme = GROUPS.map((g) => ({ ...g, points: g.points.filter((p) => match(p) && wanted(p)) })).filter((g) => g.points.length)
    if (sort === 'theme') return byTheme
    // Any other order is one flat list.
    const points = byTheme.flatMap((g) => g.points)
    if (sort === 'common') points.sort((a, b) => b.freq - a.freq)
    if (sort === 'rare') points.sort((a, b) => a.freq - b.freq)
    if (sort === 'kana') points.sort((a, b) => kanaKey(a.pattern).localeCompare(kanaKey(b.pattern), 'ja'))
    return points.length ? [{ id: 'all', name: SORT_LABEL[sort], sub: '', points }] : []
  }, [query, show, known, sort])

  const toggleKnown = (pattern: string) => void toggleKnownGrammar(pattern)

  const total = GROUPS.reduce((n, g) => n + g.points.length, 0)
  const knownCount = GROUPS.reduce((n, g) => n + g.points.filter((p) => known.has(p.pattern)).length, 0)
  const counts: Record<Show, number> = { all: total, unknown: total - knownCount, known: knownCount }
  const SHOW_LABEL: Record<Show, string> = { all: 'All', unknown: 'To learn', known: 'Known' }
  const toggle = (key: string) => setShown((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  return (
    <div className={`${s.page} ${furigana ? '' : s.noFuri}`}>
      <div className={s.head}>
        <span className={s.title}>Grammar</span>
        <span className={s.subtitle}>The {total} core N3 grammar points</span>
        <div className={s.progress} aria-label={`${knownCount} of ${total} known`}>
          <div className={s.progressFill} style={{ width: `${(knownCount / total) * 100}%` }} />
        </div>
        <span className={s.progressText}>
          <b className={s.knownNum}>{knownCount}</b> known · <b>{total - knownCount}</b> to learn
        </span>
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
        <div className={s.seg} role="group" aria-label="Show">
          {(['unknown', 'known', 'all'] as const).map((v) => (
            <button key={v} className={show === v ? s.segOn : ''} aria-pressed={show === v} onClick={() => pickShow(v)}>
              {SHOW_LABEL[v]} <span className={s.segCount}>{counts[v]}</span>
            </button>
          ))}
        </div>
        <label className={s.sortRow}>
          <span className={s.sortLabel}>Sort</span>
          <select className={s.sort} value={sort} onChange={(e) => pickSort(e.target.value as Sort)}>
            {(['theme', 'common', 'rare', 'kana'] as const).map((v) => <option key={v} value={v}>{SORT_LABEL[v]}</option>)}
          </select>
        </label>
        {sort === 'theme' && <nav className={s.chips} aria-label="Groups">
          {groups.map((g) => (
            <a key={g.id} href={`#g-${g.id}`} className={s.chip} onClick={(e) => { e.preventDefault(); document.getElementById(`g-${g.id}`)?.scrollIntoView({ behavior: 'smooth' }) }}>
              {g.name}<b>{g.points.length}</b>
            </a>
          ))}
        </nav>}
      </div>

      {groups.length === 0 && (
        <p className={s.empty}>
          {query
            ? <>Nothing matches “{query}”{show !== 'all' ? ` in ${SHOW_LABEL[show]}` : ''}. Try a pattern like ために or an English word like “even”.</>
            : show === 'known'
              ? 'Nothing marked as known yet. Tap “Mark known” on a point you’re comfortable with.'
              : 'You’ve marked every point as known. Pick “All” to see them again.'}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.id} id={`g-${g.id}`} className={s.group}>
          {sort === 'theme' ? (
            <>
              <h2 className={s.groupName}>{g.name}</h2>
              <p className={s.sub}>{g.sub}</p>
            </>
          ) : (
            (sort === 'common' || sort === 'rare') && (
              <p className={s.sub}>
                How often each point appears in about 249,000 everyday Japanese sentences (Tatoeba). Words that link two sentences, like ところが and さて, count low because each example is one sentence.
              </p>
            )
          )}
          <div className={s.cards}>
            {g.points.map((p) => (
              <article key={p.pattern} className={`${ui.card} ${s.card} ${known.has(p.pattern) ? s.isKnown : ''}`}>
                <div className={s.cardHead}>
                  <span className={s.pattern} lang="ja"><Ruby text={p.pattern} /></span>
                  <span className={s.meaning}>{p.meaning}</span>
                  <button
                    className={`${s.knownBtn} ${known.has(p.pattern) ? s.knownOn : ''}`}
                    aria-pressed={known.has(p.pattern)}
                    onClick={() => toggleKnown(p.pattern)}
                  >
                    {known.has(p.pattern) ? '✓ Known' : 'Mark known'}
                  </button>
                </div>
                <span className={s.freq} title={`In ${p.freq} of every 10,000 sentences`}>
                  <span className={s.bars} aria-hidden>
                    {[0, 1, 2, 3].map((i) => <i key={i} className={i < 4 - ['Very common', 'Common', 'Less common', 'Rare'].indexOf(tier(p.freq)) ? s.barOn : ''} />)}
                  </span>
                  {tier(p.freq)}
                </span>
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
