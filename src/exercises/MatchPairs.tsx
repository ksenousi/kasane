import { useMemo, useState } from 'react'
import { itemLabel } from '../content'
import type { Item } from '../content/schema'
import { shuffle } from '../srs/queue'
import ui from '../ui/ui.module.css'
import s from './MatchPairs.module.css'

interface Props {
  items: Item[]
  onDone: () => void
  onExit: () => void
}

const meaningOf = (i: Item) => i.meanings[0]

/** Lesson warm-up: tap a word, then its meaning. No effect on the SRS. */
export default function MatchPairs({ items, onDone, onExit }: Props) {
  const left = useMemo(() => shuffle(items), [items])
  const right = useMemo(() => shuffle(items), [items])
  const [picked, setPicked] = useState<string | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [wrong, setWrong] = useState<string | null>(null)
  const done = matched.length === items.length

  function tapRight(id: string) {
    if (!picked || matched.includes(id)) return
    if (id === picked) {
      setMatched([...matched, id])
      setPicked(null)
    } else {
      setWrong(id)
      window.setTimeout(() => setWrong(null), 450)
    }
  }

  return (
    <div className={ui.screen}>
      <div className={ui.topbar}>
        <button className={ui.iconBtn} onClick={onExit} aria-label="Back to lesson">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className={ui.bar}><div className={ui.barFill} style={{ width: `${(matched.length / items.length) * 100}%` }} /></div>
        <span className={ui.count}>{matched.length}/{items.length}</span>
      </div>
      <p className={s.hint}>Warm-up: tap a word, then its meaning</p>
      <div className={s.grid}>
        <div className={s.col} lang="ja">
          {left.map((i) => (
            <button
              key={i.id}
              className={`${s.cell} ${s.jp} ${picked === i.id ? s.sel : ''} ${matched.includes(i.id) ? s.done : ''}`}
              disabled={matched.includes(i.id)}
              onClick={() => setPicked(i.id)}
            >
              {itemLabel(i)}
            </button>
          ))}
        </div>
        <div className={s.col}>
          {right.map((i) => (
            <button
              key={i.id}
              className={`${s.cell} ${wrong === i.id ? s.bad : ''} ${matched.includes(i.id) ? s.done : ''}`}
              disabled={matched.includes(i.id)}
              onClick={() => tapRight(i.id)}
            >
              {meaningOf(i)}
            </button>
          ))}
        </div>
      </div>
      <div className={s.footer}>
        <button className={ui.btn} disabled={!done} onClick={onDone}>{done ? 'Start quiz' : 'Match them all to continue'}</button>
        {!done && <button className={s.skip} onClick={onDone}>Skip warm-up</button>}
      </div>
    </div>
  )
}
