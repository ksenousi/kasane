import { useEffect, useState } from 'react'
import { itemLabel } from '../content'
import type { Item } from '../content/schema'
import { useStore } from '../state/store'
import * as I from '../ui/icons'
import ui from '../ui/ui.module.css'
import s from './Lesson.module.css'
import { PANEL_LABEL, PanelView, WordBand, panelsFor } from './ItemCard'
import Session from './Session'

interface Props {
  onExit: () => void
}

/**
 * WaniKani-style lesson: each word in the batch is taught in steps (meaning, reading, context),
 * then a typed quiz on the whole batch. Passing the quiz starts the words at Apprentice 1.
 */
export default function Lesson({ onExit }: Props) {
  const { lessons, settings, completeLessons } = useStore()
  const [batch] = useState<Item[]>(() => lessons.slice(0, settings.lessonBatch))
  const [step, setStep] = useState(0)
  const steps = batch.flatMap((item, i) => panelsFor(item).map((panel) => ({ i, panel })))
  const [phase, setPhase] = useState<'learn' | 'quiz' | 'done'>('learn')

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

  const { i, panel } = steps[step]
  const item = batch[i]
  const last = step === steps.length - 1
  const goItem = (k: number) => setStep(steps.findIndex((x) => x.i === k))

  return (
    <div className={ui.screen}>
      <div className={ui.topbar}>
        <button className={ui.iconBtn} onClick={onExit} aria-label="Close lesson"><I.Close /></button>
        <span className={s.step}>Lesson · word {i + 1} of {batch.length}</span>
        <span className={`${ui.pill} ${ui.pillVocab}`}>Vocab</span>
      </div>

      <WordBand item={item} showReading={panel !== 'meaning'} />
      <div className={s.tabs} role="tablist">
        {panelsFor(item).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={p === panel}
            className={`${s.tab} ${p === panel ? s.tabOn : ''}`}
            onClick={() => setStep(steps.findIndex((x) => x.i === i && x.panel === p))}
          >
            {PANEL_LABEL[p]}
          </button>
        ))}
      </div>

      <div className={s.body}>
        <PanelView item={item} panel={panel} />
      </div>

      <div className={s.footer}>
        <div className={s.chips} lang="ja">
          {batch.map((b, k) => (
            <button key={b.id} className={`${s.chip} ${k === i ? s.chipOn : ''}`} onClick={() => goItem(k)}>{itemLabel(b)}</button>
          ))}
        </div>
        <div className={s.nav}>
          <button className={ui.btnGhost} style={{ width: 120 }} disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
          <button className={ui.btn} onClick={() => (last ? setPhase('quiz') : setStep(step + 1))}>{last ? 'Start quiz' : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
