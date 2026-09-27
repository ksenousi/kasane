import { useState, type ReactNode } from 'react'
import ui from '../ui/ui.module.css'
import type { ChoiceQuestion, OrderQuestion, Prompt, Question, TilesQuestion } from './build'
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
          <span className={`${s.cardLabel} ${prompt.vocab ? s.cardVocab : ''}`} lang="ja">{prompt.label}</span>
          <span className={s.cardText}>{prompt.text}</span>
          {prompt.sentence && <span lang="ja"><Sentence text={prompt.sentence} /></span>}
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

  if (q.layout === 'chips') {
    return (
      <div className={s.chips} lang="ja">
        {q.options.map((o) => (
          <button key={o} className={`${s.chip} ${cls(o)}`} onClick={() => pick(o)}>{o}</button>
        ))}
      </div>
    )
  }
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

function Order({ q, given, onAnswer }: { q: OrderQuestion; given: Given | null; onAnswer: (g: Given) => void }) {
  const [slots, setSlots] = useState<(number | null)[]>(() => q.correct.map(() => null))
  const place = (i: number) => {
    if (given || slots.includes(i)) return
    const j = slots.indexOf(null)
    if (j >= 0) setSlots(slots.map((x, k) => (k === j ? i : x)))
  }
  const full = slots.every((x) => x !== null)
  const check = () => {
    const value = slots.map((x) => q.pool[x!]).join(' → ')
    onAnswer({ value, correct: slots.every((x, k) => q.pool[x!] === q.correct[k]) })
  }
  return (
    <>
      <div className={s.orderLine} lang="ja">
        <span>{q.before}</span>
        {slots.map((x, k) => (
          <button
            key={k}
            className={`${s.slot} ${x !== null ? s.slotFilled : ''} ${k === q.star ? s.star : ''} ${given && k === q.star ? (given.correct ? s.right : s.wrong) : ''}`}
            disabled={!!given}
            onClick={() => setSlots(slots.map((y, m) => (m === k ? null : y)))}
            aria-label={k === q.star ? 'Star slot' : `Slot ${k + 1}`}
          >
            {x !== null ? q.pool[x] : k === q.star ? '★' : ''}
          </button>
        ))}
        <span>{q.after}</span>
      </div>
      <div className={s.spacer} />
      <div className={s.tiles} lang="ja">
        {q.pool.map((t, i) => (
          <button key={i} className={`${s.tile} ${slots.includes(i) ? s.used : ''}`} disabled={!!given || slots.includes(i)} onClick={() => place(i)}>
            {t}
          </button>
        ))}
      </div>
      {!given && (
        <div className={s.actions}>
          <button className={ui.btnGhost} style={{ width: 120 }} onClick={() => setSlots(q.correct.map(() => null))}>Clear</button>
          <button className={ui.btn} disabled={!full} onClick={check}>Check</button>
        </div>
      )}
    </>
  )
}

export default function QuestionView({ question: q, given, onAnswer }: Props) {
  const showBand = q.kind !== 'order' && !(q.kind === 'choice' && q.layout === 'chips')
  return (
    <div className={s.wrap}>
      {showBand && (
        <div className={s.band}>
          <PromptView prompt={q.prompt} />
        </div>
      )}
      <p className={s.instruction}>{q.instruction}</p>
      {q.kind === 'choice' && <div className={s.spacer} />}
      {q.kind === 'choice' && <Choice q={q} given={given} onAnswer={onAnswer} />}
      {q.kind === 'tiles' && <Tiles q={q} given={given} onAnswer={onAnswer} />}
      {q.kind === 'order' && <Order q={q} given={given} onAnswer={onAnswer} />}
    </div>
  )
}
