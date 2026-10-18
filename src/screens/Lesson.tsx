import { useEffect, useState } from 'react'
import { itemLabel } from '../content'
import type { Item } from '../content/schema'
import { useStore } from '../state/store'
import * as I from '../ui/icons'
import ui from '../ui/ui.module.css'
import s from './Lesson.module.css'
import ItemCard from './ItemCard'
import Session from './Session'

interface Props {
  onExit: () => void
}

/**
 * WaniKani-style lesson: each word in the batch is taught on one page (meaning, reading, context),
 * then a typed quiz on the whole batch. Passing the quiz starts the words at Apprentice 1.
 */
export default function Lesson({ onExit }: Props) {
  const { lessons, settings, completeLessons } = useStore()
  const [batch] = useState<Item[]>(() => lessons.slice(0, settings.lessonBatch))
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<'learn' | 'quiz' | 'done'>('learn')
  // Words already shown. Jumping ahead with the chips can reach the last word early,
  // so the quiz only unlocks once every word has been seen.
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]))

  useEffect(() => {
    setSeen((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
  }, [i])

  useEffect(() => {
    if (batch.length === 0) onExit()
  }, [batch, onExit])

  if (batch.length === 0) return null

  if (phase === 'quiz') {
    return (
      <Session
        items={batch}
        mode="quiz"
        onExit={() => setPhase('learn')}
        onComplete={async () => {
          await completeLessons(batch.map((i) => i.id))
          setPhase('done')
        }}
      />
    )
  }

  if (phase === 'done') {
    return (
      <div className={`${ui.screen} ${s.done}`}>
        <span className={s.doneTitle}>Lesson done</span>
        <p className={s.doneText}>{batch.length} new words are now at Apprentice 1. Your first review is ready within 4 hours.</p>
        <div className={s.chips} lang="ja">{batch.map((i) => <span key={i.id} className={s.chip}>{itemLabel(i)}</span>)}</div>
        <button className={ui.btn} onClick={onExit}>Back to home</button>
      </div>
    )
  }

  const item = batch[i]
  const last = i === batch.length - 1
  const unseen = batch.findIndex((_, k) => !seen.has(k))
  const ready = last && unseen === -1

  return (
    <div className={ui.screen}>
      <div className={ui.topbar}>
        <button className={ui.iconBtn} onClick={onExit} aria-label="Close lesson"><I.Close /></button>
        <span className={s.step}>Lesson · word {i + 1} of {batch.length}</span>
        <span className={`${ui.pill} ${ui.pillVocab}`}>Vocab</span>
      </div>

      <ItemCard item={item} />

      <div className={s.footer}>
        <div className={s.chips} lang="ja">
          {batch.map((b, k) => (
            <button key={b.id} className={`${s.chip} ${k === i ? s.chipOn : ''}`} onClick={() => setI(k)}>{itemLabel(b)}</button>
          ))}
        </div>
        <div className={s.nav}>
          <button className={ui.btnGhost} style={{ width: 120 }} disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
          <button className={ui.btn} onClick={() => (ready ? setPhase('quiz') : last ? setI(unseen) : setI(i + 1))}>{ready ? 'Start quiz' : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
