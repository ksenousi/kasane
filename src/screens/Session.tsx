import { useEffect, useMemo, useRef, useState } from 'react'
import { ITEMS_BY_ID } from '../content'
import type { Item } from '../content/schema'
import { buildQuestion, correctAnswerText, type Question } from '../exercises/build'
import FlipCard from '../exercises/FlipCard'
import QuestionView, { type Given } from '../exercises/QuestionView'
import { pickExercise, type ExerciseId } from '../srs/queue'
import { answer, answerAllParts, currentTask, finishedCount, markHeld, startSession, type Finished, type SessionState } from '../srs/session'
import { nextStage } from '../srs/engine'
import { STAGES, type Stage } from '../srs/stages'
import { useStore } from '../state/store'
import * as I from '../ui/icons'
import ui from '../ui/ui.module.css'
import s from './Session.module.css'

interface Props {
  items: Item[]
  /**
   * 'review' = SRS review. 'quiz' = end-of-lesson quiz with easy formats.
   * 'drill' = extra practice from Weak spots: formats match the item's stage, no SRS changes.
   */
  mode: 'review' | 'quiz' | 'drill'
  onExit: () => void
  onComplete: (summary: Summary) => void
  onFinished?: (f: Finished) => void
}

export interface Summary {
  answered: number
  correct: number
  items: number
}

export default function Session({ items, mode, onExit, onComplete, onFinished }: Props) {
  const { progress, settings, logAnswer } = useStore()
  const [state, setState] = useState<SessionState>(() => startSession(items))
  const [given, setGiven] = useState<Given | null>(null)
  const lastEx = useRef<ExerciseId | undefined>(undefined)
  const task = currentTask(state)
  const item = task ? ITEMS_BY_ID.get(task.itemId) : undefined
  const stage: Stage = mode === 'quiz' ? 1 : (progress.get(task?.itemId ?? '')?.stage ?? 1)

  // A new question each time the task changes (answered count keys it, so a requeued part gets a fresh one).
  const question: Question | null = useMemo(() => {
    if (!task || !item) return null
    const ex = pickExercise(item, task.part, stage, Math.random, lastEx.current)
    if (!ex) return null
    lastEx.current = ex
    return buildQuestion(item, ex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.answered, task?.itemId, task?.part])

  // Items with no question for a part (missing data) are skipped as correct so a session never stalls.
  useEffect(() => {
    if (task && !question) advance(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, question])

  useEffect(() => {
    if (!task) onComplete({ answered: state.answered, correct: state.correct, items: state.total })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task])

  function advance(correct: boolean) {
    apply(answer(state, correct))
  }

  function apply(r: { state: SessionState; finished?: Finished }) {
    if (r.finished) onFinished?.(r.finished)
    setGiven(null)
    setState(r.state)
  }

  function onAnswer(g: Given) {
    setGiven(g)
  }

  function next() {
    if (!given || !task || !question) return
    logAnswer({ itemId: task.itemId, part: task.part, exercise: question.ex, correct: given.correct, given: given.value, mode })
    advance(given.correct)
  }

  if (!task || !item || !question) return <div className={ui.screen} />

  const flip = mode === 'review' && settings.flipMode && stage >= 7 && !state.held.includes(item.id)

  const done = finishedCount(state)
  const pct = state.total ? (done / state.total) * 100 : 0
  const miss = given && !given.correct
  const current = progress.get(item.id)?.stage ?? 0
  const drop = mode === 'review' && miss ? nextStage(current, (state.misses[item.id] ?? 0) + 1) : null

  return (
    <div className={ui.screen}>
      <div className={ui.topbar}>
        <button className={ui.iconBtn} onClick={onExit} aria-label="End session"><I.Close /></button>
        <div className={ui.bar}><div className={ui.barFill} style={{ width: `${pct}%` }} /></div>
        <span className={ui.count}>{done}/{state.total}</span>
      </div>
      <div className={s.meta}>
        <span className={`${ui.pill} ${item.kind === 'vocab' ? ui.pillVocab : ui.pillGrammar}`}>{item.kind === 'vocab' ? 'Vocab' : 'Grammar'}</span>
        <span className={ui.pill}>{flip ? 'Recall' : question.tag}</span>
        {mode === 'review' && <span className={s.stage}>{STAGES[current].name}</span>}
      </div>

      {flip ? (
        <FlipCard
          key={state.answered}
          item={item}
          onKnew={() => {
            logAnswer({ itemId: item.id, part: task.part, exercise: 'RC', correct: true, mode })
            apply(answerAllParts(state))
          }}
          onMissed={() => {
            logAnswer({ itemId: item.id, part: task.part, exercise: 'RC', correct: false, mode })
            advance(false)
          }}
          onChoices={() => setState(markHeld(state, item.id))}
        />
      ) : (
        <QuestionView key={state.answered} question={question} given={given} onAnswer={onAnswer} />
      )}

      {given && (
        <div className={`${s.feedback} ${given.correct ? s.ok : s.bad}`}>
          {miss ? (
            <>
              <div className={s.rows}>
                <div className={s.row}><span className={s.k}>You picked</span><span className={s.gave} lang="ja">{given.value}</span></div>
                <div className={s.row}><span className={s.k}>Correct</span><span className={s.ans} lang="ja">{correctAnswerText(question)}</span></div>
              </div>
              <Explain item={item} question={question} />
              {drop !== null && (
                <div className={s.stageMove}>
                  <span>{STAGES[current].name}</span>
                  <I.Arrow width={16} height={16} />
                  <span>{STAGES[drop].name}</span>
                  <span className={s.later}>asked again this session</span>
                </div>
              )}
              <div className={s.actions}>
                <button className={ui.btnGhost} onClick={() => setGiven(null)}>Misclick — undo</button>
                <button className={ui.btn} onClick={next}>Continue</button>
              </div>
            </>
          ) : (
            <div className={s.okRow}>
              <span className={s.okText}><I.Check width={20} height={20} />Correct</span>
              <button className={ui.btn} onClick={next} autoFocus>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Explain({ item, question }: { item: Item; question: Question }) {
  const head =
    item.kind === 'vocab'
      ? `${item.word} · ${item.reading} · ${item.meanings.join(', ')}`
      : `${item.pattern} · ${item.meaning}`
  const fix = question.ex === 'G5' && item.kind === 'grammar' && item.errorSpot ? `Should be ${item.errorSpot.fix}.` : null
  return (
    <div className={s.explain}>
      <span className={s.head} lang="ja">{head}</span>
      {item.kind === 'grammar' && <span className={s.note} lang="ja">{item.connection}</span>}
      {fix && <span className={s.note} lang="ja">{fix}</span>}
      {question.kind === 'order' && <span className={s.note}>{question.en}</span>}
      {item.note && <span className={s.note} lang="ja">{item.note}</span>}
    </div>
  )
}
