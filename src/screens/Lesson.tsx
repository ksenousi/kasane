import { useEffect, useState } from 'react'
import { itemLabel } from '../content'
import type { Item } from '../content/schema'
import { useStore } from '../state/store'
import * as I from '../ui/icons'
import ui from '../ui/ui.module.css'
import s from './Lesson.module.css'
import ItemCard from './ItemCard'
import Session from './Session'
import MatchPairs from '../exercises/MatchPairs'

interface Props {
  onExit: () => void
}

/** Learn a batch of new items card by card, then a short quiz; passing it starts them in the SRS. */
export default function Lesson({ onExit }: Props) {
  const { lessons, settings, completeLessons } = useStore()
  const [batch] = useState<Item[]>(() => lessons.slice(0, settings.lessonBatch))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'learn' | 'match' | 'quiz' | 'done'>('learn')

  useEffect(() => {
    if (batch.length === 0) onExit()
  }, [batch, onExit])

  if (batch.length === 0) return null

  if (phase === 'match') {
    return <MatchPairs items={batch} onDone={() => setPhase('quiz')} onExit={() => setPhase('learn')} />
  }

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
        <p className={s.doneText}>{batch.length} new items are now at Apprentice 1. Your first review is in 4 hours.</p>
        <div className={s.chips} lang="ja">{batch.map((i) => <span key={i.id} className={s.chip}>{itemLabel(i)}</span>)}</div>
        <button className={ui.btn} onClick={onExit}>Back to home</button>
      </div>
    )
  }

  const item = batch[index]
  const last = index === batch.length - 1

  return (
    <div className={ui.screen}>
      <div className={ui.topbar}>
        <button className={ui.iconBtn} onClick={onExit} aria-label="Close lesson"><I.Close /></button>
        <span className={s.step}>Lesson · {index + 1} of {batch.length}</span>
        <span className={`${ui.pill} ${ui.pillVocab}`}>Vocab</span>
      </div>

      <ItemCard item={item} />

      <div className={s.footer}>
        <div className={s.chips} lang="ja">
          {batch.map((b, i) => (
            <button key={b.id} className={`${s.chip} ${i === index ? s.chipOn : ''}`} onClick={() => setIndex(i)}>{itemLabel(b)}</button>
          ))}
        </div>
        <div className={s.nav}>
          <button className={ui.btnGhost} style={{ width: 120 }} disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
          <button className={ui.btn} onClick={() => (last ? setPhase(batch.length > 1 ? 'match' : 'quiz') : setIndex(index + 1))}>{last ? 'Start quiz' : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}

