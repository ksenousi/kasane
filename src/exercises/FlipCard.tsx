import { useState } from 'react'
import { hasKanji, itemLabel } from '../content'
import type { Item } from '../content/schema'
import { useTapGuard } from '../lib/tapGuard'
import * as I from '../ui/icons'
import ui from '../ui/ui.module.css'
import s from './FlipCard.module.css'

interface Props {
  item: Item
  onKnew: () => void
  onMissed: () => void
  /** "Not sure": fall back to a normal question for half credit. */
  onChoices: () => void
}

/** Recall mode for Master+ items: recall it in your head, flip, grade yourself. */
export default function FlipCard({ item, onKnew, onMissed, onChoices }: Props) {
  const [shown, setShown] = useState(false)
  const ex = item.examples[0]
  const guard = useTapGuard()

  return (
    <div className={s.wrap} onClickCapture={guard}>
      <button className={s.card} onClick={() => setShown(true)} disabled={shown} aria-label={shown ? undefined : 'Show answer'}>
        <span className={s.word} lang="ja">{itemLabel(item)}</span>
        {!shown && <span className={s.hint}>{hasKanji(item.word) ? 'Recall the reading and meaning, then tap' : 'Recall the meaning, then tap'}</span>}
        {shown && (
          <>
            {hasKanji(item.word) && <span className={s.reading} lang="ja">{item.reading}</span>}
            <span className={s.rule} />
            <span className={s.meaning}>{item.meanings.join('; ')}</span>
            {ex && <span className={s.ex} lang="ja">{ex.full}</span>}
            {ex && <span className={s.sub}>{ex.en}</span>}
          </>
        )}
      </button>

      {shown ? (
        <div className={s.grade}>
          <button className={s.missed} onClick={onMissed}><I.Back width={18} height={18} />Missed it</button>
          <button className={s.knew} onClick={onKnew}>Knew it<I.Arrow width={18} height={18} /></button>
        </div>
      ) : (
        <div className={s.actions}>
          <button className={ui.btn} onClick={() => setShown(true)}>Show answer</button>
          <button className={ui.btnGhost} onClick={onChoices}>Not sure — give me choices</button>
          <span className={s.note}>Choices only count as half a pass: the item stays at its stage.</span>
        </div>
      )}
    </div>
  )
}
