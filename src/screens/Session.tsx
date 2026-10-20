import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { ITEMS_BY_ID } from '../content'
import type { Item } from '../content/schema'
import { checkAnswer, finishKana, imeKana, type Verdict } from '../srs/answer'
import { nextStage } from '../srs/engine'
import type { Part } from '../srs/queue'
import { answer, currentTask, finishedCount, startSession, type Finished, type SessionState } from '../srs/session'
import { STAGES, type Stage } from '../srs/stages'
import { useStore } from '../state/store'
import * as I from '../ui/icons'
import ui from '../ui/ui.module.css'
import s from './Session.module.css'

interface Props {
  items: Item[]
  /** 'review' = SRS review. 'quiz' = end-of-lesson quiz. 'drill' = extra practice from Weak spots, no SRS changes. */
  mode: 'review' | 'quiz' | 'drill'
  onExit: () => void
  onComplete: (summary: Summary) => void
  onFinished?: (f: Finished) => void
}

export interface Summary {
  answered: number
  correct: number
  items: number
  /** Longest run of correct answers in a row. */
  best: number
  /** Reviews only: each word's stage change, in the order they finished. */
  moves: Move[]
}

export interface Move {
  itemId: string
  from: Stage
  to: Stage
  /** Parts answered wrong at least once this round. */
  missed: Part[]
}

/** How long a correct answer stays on screen before the next prompt. */
const AUTO_NEXT_MS = 650

type Graded = { value: string; verdict: Extract<Verdict, { kind: 'correct' | 'wrong' }> }

/** WaniKani-style typed review: one prompt at a time, meaning in English or reading in kana. */
export default function Session({ items, mode, onExit, onComplete, onFinished }: Props) {
  const { progress, logAnswer, synonyms, addSynonym } = useStore()
  const [state, setState] = useState<SessionState>(() => startSession(items))
  const [text, setText] = useState('')
  const [graded, setGraded] = useState<Graded | null>(null)
  const [invalid, setInvalid] = useState<string | null>(null)
  const [info, setInfo] = useState(false)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const moves = useRef<Move[]>([])
  const missed = useRef(new Map<string, Set<Part>>())
  const task = currentTask(state)
  const item = task ? ITEMS_BY_ID.get(task.itemId) : undefined

  useEffect(() => {
    if (!task) onComplete({ answered: state.answered, correct: state.correct, items: state.total, best, moves: moves.current })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task])

  // A clean correct answer moves on by itself, so the fast path is type → Enter → type.
  // Opening item info, or a "close enough" answer worth reading, holds the screen.
  const autoNext = graded?.verdict.kind === 'correct' && !graded.verdict.close && !info
  const advanced = useRef<Graded | null>(null)
  useEffect(() => {
    if (!autoNext) return
    const g = graded
    const t = window.setTimeout(() => advanced.current !== g && next(), AUTO_NEXT_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNext, graded])

  if (!task || !item) return <div className={ui.screen} />

  const part = task.part
  const reading = part === 'reading'
  const mine = synonyms.get(item.id) ?? []

  function submit(e: FormEvent) {
    e.preventDefault()
    if (graded) return next()
    const v = checkAnswer(part, text, item!, mine)
    if (v.kind === 'invalid') {
      setInvalid(v.message)
      input.current?.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }],
        { duration: 300 },
      )
      return
    }
    setInvalid(null)
    setGraded({ value: reading ? finishKana(text) : text.trim(), verdict: v })
    if (reading) setText(finishKana(text))
  }

  function next() {
    if (!graded || !task || advanced.current === graded) return
    advanced.current = graded
    const correct = graded.verdict.kind === 'correct'
    logAnswer({ itemId: task.itemId, part, correct, given: graded.value, mode })
    const run = correct ? streak + 1 : 0
    setStreak(run)
    setBest(Math.max(best, run))
    if (!correct) missed.current.set(task.itemId, new Set(missed.current.get(task.itemId)).add(part))
    const r = answer(state, correct)
    if (r.finished && mode === 'review') {
      const from = progress.get(r.finished.itemId)?.stage ?? 0
      moves.current.push({ itemId: r.finished.itemId, from, to: nextStage(from, r.finished.misses), missed: [...(missed.current.get(r.finished.itemId) ?? [])] })
    }
    if (r.finished) onFinished?.(r.finished)
    setState(r.state)
    setText('')
    setGraded(null)
    setInfo(false)
    input.current?.focus()
  }

  /** "My answer means the same thing": save it as a synonym and count it as correct. */
  function acceptAsSynonym() {
    if (!graded || !item) return
    void addSynonym(item.id, graded.value)
    setGraded({ ...graded, verdict: { kind: 'correct', close: false } })
    input.current?.focus()
  }

  /** Typo or slip: take the answer back and type it again, unscored. */
  function undo() {
    setGraded(null)
    input.current?.focus()
  }

  const done = finishedCount(state)
  const pct = state.total ? (done / state.total) * 100 : 0
  const accuracy = state.answered ? Math.round((state.correct / state.answered) * 100) : null
  const current = progress.get(item.id)?.stage ?? 0
  const wrong = graded?.verdict.kind === 'wrong'
  const close = graded?.verdict.kind === 'correct' && graded.verdict.close
  const drop = mode === 'review' && wrong ? nextStage(current, (state.misses[item.id] ?? 0) + 1) : null
  const resultClass = graded ? (wrong ? s.bad : s.ok) : ''

  return (
    <div className={`${ui.screen} ${s.session}`}>
      <div className={ui.topbar}>
        <button className={ui.iconBtn} onClick={onExit} aria-label="End session"><I.Close /></button>
        <div className={ui.bar}><div className={ui.barFill} style={{ width: `${pct}%` }} /></div>
        <span className={ui.count}>{done}/{state.total}{accuracy !== null && ` · ${accuracy}%`}</span>
        {streak >= 3 && <span key={streak} className={s.streak} aria-label={`${streak} in a row`}>🔥{streak}</span>}
      </div>

      <div className={s.word} lang="ja" style={{ '--len': item.word.length } as CSSProperties}>{item.word}</div>
      <div className={`${s.prompt} ${reading ? s.promptReading : s.promptMeaning}`}>
        Vocabulary <b>{reading ? 'Reading' : 'Meaning'}</b>
        {mode === 'review' && <span className={s.stage}>{STAGES[current].name}</span>}
      </div>

      <form className={s.form} onSubmit={submit}>
        <input
          ref={input}
          className={`${s.input} ${resultClass}`}
          value={text}
          onChange={(e) => {
            if (graded) return
            setInvalid(null)
            setText(reading ? imeKana(e.target.value) : e.target.value)
          }}
          placeholder={reading ? '答え' : 'Your answer'}
          lang={reading ? 'ja' : 'en'}
          aria-label={reading ? 'Reading in kana' : 'Meaning in English'}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint={graded ? 'next' : 'done'}
        />
        <button type="submit" className={`${s.go} ${resultClass}`} aria-label={graded ? 'Next' : 'Check'}>
          <I.Arrow />
        </button>
      </form>
      {invalid && <p className={s.invalid} role="status">{invalid}</p>}

      {graded && (
        <div className={s.result}>
          {wrong ? (
            <>
              <div className={s.answerRow}>
                <span className={s.k}>Answer</span>
                <span className={s.ans} lang="ja">{expected(item, part, mine)}</span>
              </div>
              {drop !== null && (
                <div className={s.stageMove}>
                  <span>{STAGES[current].name}</span>
                  <I.Arrow width={16} height={16} />
                  <span>{STAGES[drop].name}</span>
                  <span className={s.later}>asked again this session</span>
                </div>
              )}
              <Explain item={item} part={part} mine={mine} />
              <div className={s.actions}>
                <button className={ui.btnGhost} onClick={undo}>Undo typo</button>
                {!reading && <button className={ui.btnGhost} onClick={acceptAsSynonym}>Add as synonym</button>}
                <button className={ui.btn} onClick={next}>Next</button>
              </div>
            </>
          ) : (
            <>
              <div className={s.okRow}>
                <span className={`${s.okText} ${s.pop}`}><I.Check width={20} height={20} />{close ? 'Close enough' : cheer(streak + 1)}</span>
                <button className={s.infoBtn} onClick={() => setInfo(!info)} aria-expanded={info}>{info ? 'Hide info' : 'Item info'}</button>
              </div>
              {close && <p className={s.note}>Exact answer: {[...item.meanings, ...mine].join(', ')}</p>}
              {info && <Explain item={item} part={part} mine={mine} />}
              {!autoNext && <button className={ui.btn} onClick={next}>Next</button>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function cheer(run: number): string {
  if (run >= 10) return `${run} in a row!`
  if (run >= 5) return 'On a roll'
  return 'Correct'
}

function expected(item: Item, part: Part, mine: string[]): string {
  return part === 'reading' ? [item.reading, ...(item.readings ?? [])].join('、') : [...item.meanings, ...mine].join(', ')
}

function Explain({ item, part, mine }: { item: Item; part: Part; mine: string[] }) {
  const hook = part === 'reading' ? item.mnemonic.reading : item.mnemonic.meaning
  return (
    <div className={s.explain}>
      <span className={s.head} lang="ja">{item.word} · {item.reading} · {[...item.meanings, ...mine].join(', ')}</span>
      {hook && <span className={s.hook} lang="ja">{hook}</span>}
      {item.note && <span className={s.note} lang="ja">{item.note}</span>}
    </div>
  )
}
