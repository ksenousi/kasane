import { useEffect, useState } from 'react'
import { ITEMS_BY_ID, itemLabel } from '../content'
import type { Item } from '../content/schema'
import { db, type Answer } from '../db'
import type { Part } from '../srs/queue'
import ui from '../ui/ui.module.css'
import s from './WeakSpots.module.css'

const SECTIONS: { ja: string; en: string; part: Part }[] = [
  { ja: '意味', en: 'Meaning', part: 'meaning' },
  { ja: '読み方', en: 'Reading', part: 'reading' },
]

export default function WeakSpots({ onDrill }: { onDrill: (items: Item[]) => void }) {
  const [answers, setAnswers] = useState<Answer[] | null>(null)

  useEffect(() => {
    void db.answers.toArray().then(setAnswers)
  }, [])

  if (!answers) return null

  const byItem = new Map<string, { right: number; total: number }>()
  for (const a of answers) {
    const e = byItem.get(a.itemId) ?? { right: 0, total: 0 }
    e.total++
    if (a.correct) e.right++
    byItem.set(a.itemId, e)
  }
  const weakest = [...byItem.entries()]
    .filter(([id, e]) => ITEMS_BY_ID.has(id) && e.total >= 2 && e.right < e.total)
    .sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total)
    .slice(0, 8)

  return (
    <div className={s.page}>
      <div className={s.head}>
        <span className={ui.label}>From {answers.length} answers</span>
        <span className={s.title}>Weak spots</span>
      </div>

      <section className={ui.card}>
        {SECTIONS.map((sec) => {
          const rows = answers.filter((a) => a.part === sec.part)
          const right = rows.filter((a) => a.correct).length
          const pct = rows.length ? Math.round((right / rows.length) * 100) : null
          return (
            <div key={sec.ja} className={s.row}>
              <div className={s.names}>
                <span lang="ja">{sec.ja}</span>
                <span className={s.en}>{sec.en}</span>
              </div>
              <span className={s.n}>{rows.length}</span>
              <div className={s.track}>
                <div className={`${s.fill} ${pct !== null && pct < 70 ? s.low : ''}`} style={{ width: `${pct ?? 0}%` }} />
              </div>
              <span className={`${s.pct} ${pct !== null && pct < 70 ? s.lowText : ''}`}>{pct === null ? '—' : `${pct}%`}</span>
            </div>
          )
        })}
      </section>

      <section className={ui.card}>
        <span className={ui.label}>Most missed items</span>
        {weakest.length === 0 ? (
          <p className={s.empty}>Nothing yet. Items you miss more than once show up here.</p>
        ) : (
          <>
          <div className={s.items}>
            {weakest.map(([id, e]) => {
              const item = ITEMS_BY_ID.get(id)
              if (!item) return null
              return (
                <div key={id} className={s.item}>
                  <span lang="ja">{itemLabel(item)}</span>
                  <span className={s.en}>{e.right}/{e.total} right</span>
                </div>
              )
            })}
          </div>
          <button className={ui.btn} style={{ marginTop: 14 }} onClick={() => onDrill(weakest.map(([id]) => ITEMS_BY_ID.get(id)).filter((i): i is Item => !!i))}>
            Drill these {weakest.length} (no SRS effect)
          </button>
          </>
        )}
      </section>
    </div>
  )
}
