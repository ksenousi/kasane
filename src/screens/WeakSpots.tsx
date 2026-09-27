import { useEffect, useState } from 'react'
import { ITEMS_BY_ID, itemLabel } from '../content'
import { db, type Answer } from '../db'
import type { ExerciseId } from '../srs/queue'
import ui from '../ui/ui.module.css'
import s from './WeakSpots.module.css'

/** Question formats grouped the way the JLPT paper groups them. */
const SECTIONS: { ja: string; en: string; exercises: ExerciseId[] }[] = [
  { ja: '漢字読み', en: 'Kanji reading', exercises: ['V10', 'V3'] },
  { ja: '語彙の意味', en: 'Word meaning', exercises: ['V1', 'V2'] },
  { ja: '文脈規定', en: 'Word in context', exercises: ['V5'] },
  { ja: '言い換え類義', en: 'Paraphrase', exercises: ['V6'] },
  { ja: '用法', en: 'Usage', exercises: ['V7'] },
  { ja: '文法形式の判断', en: 'Pick the grammar', exercises: ['G1', 'G3', 'G7'] },
  { ja: '文の組み立て', en: 'Sentence order ★', exercises: ['G2'] },
  { ja: '文法の意味', en: 'Grammar meaning & errors', exercises: ['G5', 'G6'] },
  { ja: '思い出す', en: 'Recall cards', exercises: ['RC'] },
]

export default function WeakSpots() {
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
    .filter(([, e]) => e.total >= 2 && e.right < e.total)
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
          const rows = answers.filter((a) => sec.exercises.includes(a.exercise))
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
        )}
      </section>
    </div>
  )
}
