import { useState, type ReactNode } from 'react'
import { useTapGuard } from '../lib/tapGuard'
import ui from '../ui/ui.module.css'
import type { ChoiceQuestion, Prompt, Question, TilesQuestion } from './build'
import s from './Question.module.css'

/** The user's answer once given: what they picked and whether it was right. */
export interface Given {
  value: string
  correct: boolean
}

interface Props {
  question: Question
  given: Given | null
  onAnswer: (g: Given) => void
}

/** Renders `＿` as a blank and 【x】 as underlined x. */
function Sentence({ text }: { text: string }) {
  const parts: ReactNode[] = []
  const re = /＿|【([^】]+)】/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    parts.push(text.slice(last, m.index))
    parts.push(m[0] === '＿' ? <span key={m.index} className={s.blank} /> : <span key={m.index} className={s.under}>{m[1]}</span>)
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  return <span className={s.sentence}>{parts}</span>
}

function PromptView({ prompt }: { prompt: Prompt }) {
  switch (prompt.type) {
    case 'word':
      return <span className={s.word} lang="ja">{prompt.text}</span>
    case 'english':
      return <span className={s.english}>{prompt.text}</span>
    case 'sentence':
      return <span lang="ja"><Sentence text={prompt.text} /></span>
    case 'card':
      return (
        <>
          <span className={s.cardLabel} lang="ja">{prompt.label}</span>
          <span className={s.cardText}>{prompt.text}</span>
        </>
      )
  }
}

function Choice({ q, given, onAnswer }: { q: ChoiceQuestion; given: Given | null; onAnswer: (g: Given) => void }) {
  const cls = (o: string) => {
    if (!given) return ''
    if (o === q.answer) return s.right
    if (o === given.value) return s.wrong
    return s.dim
  }
  const pick = (o: string) => !given && onAnswer({ value: o, correct: o === q.answer })
  const long = q.options.some((o) => o.length > 14)
  const gridLong = q.options.some((o) => o.length > 5)

  if (q.layout === 'grid') {
    return (
      <div className={s.grid} lang="ja">
        {q.options.map((o) => (
          <button key={o} className={`${s.opt} ${s.gridOpt} ${gridLong ? s.gridLong : ''} ${cls(o)}`} onClick={() => pick(o)}>{o}</button>
        ))}
      </div>
    )
  }
  return (
    <div className={s.options}>
      {q.options.map((o, i) => (
        <button key={o} className={`${s.opt} ${long ? s.long : ''} ${cls(o)}`} onClick={() => pick(o)}>
          <span className={s.key}>{i + 1}</span>
          <span>{o}</span>
        </button>
      ))}
    </div>
  )
}

function Tiles({ q, given, onAnswer }: { q: TilesQuestion; given: Given | null; onAnswer: (g: Given) => void }) {
  const [used, setUsed] = useState<number[]>([])
  const value = used.map((i) => q.tiles[i]).join('')
  return (
    <>
      <div className={`${s.answerLine} ${given ? (given.correct ? s.right : s.wrong) : ''}`} lang="ja">
        {used.length === 0 && <span className={s.cardText}>Your answer appears here</span>}
        {used.map((i, j) => (
          <button key={j} className={s.tile} disabled={!!given} onClick={() => setUsed(used.filter((_, x) => x !== j))} aria-label={`Remove ${q.tiles[i]}`}>
            {q.tiles[i]}
          </button>
        ))}
      </div>
      <div className={s.spacer} />
      <div className={s.tiles} lang="ja">
        {q.tiles.map((t, i) => (
          <button key={i} className={`${s.tile} ${used.includes(i) ? s.used : ''}`} disabled={!!given || used.includes(i)} onClick={() => setUsed([...used, i])}>
            {t}
          </button>
        ))}
      </div>
      {!given && (
        <div className={s.actions}>
          <button className={ui.btnGhost} style={{ width: 120 }} onClick={() => setUsed([])}>Clear</button>
          <button className={ui.btn} disabled={used.length === 0} onClick={() => onAnswer({ value, correct: value === q.answer })}>Check</button>
        </div>
      )}
    </>
  )
}

export default function QuestionView({ question: q, given, onAnswer }: Props) {
  const guard = useTapGuard()
  return (
    <div className={s.wrap} onClickCapture={guard}>
      <div className={s.band}>
        <PromptView prompt={q.prompt} />
      </div>
      <p className={s.instruction}>{q.instruction}</p>
      {q.kind === 'choice' && <div className={s.spacer} />}
      {q.kind === 'choice' && <Choice q={q} given={given} onAnswer={onAnswer} />}
      {q.kind === 'tiles' && <Tiles q={q} given={given} onAnswer={onAnswer} />}
    </div>
  )
}
