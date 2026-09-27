import type { Item } from '../content/schema'
import { formatIn } from '../lib/clock'
import { STAGES } from '../srs/stages'
import { useStore } from '../state/store'
import * as I from '../ui/icons'
import ui from '../ui/ui.module.css'
import ItemCard from './ItemCard'
import s from './Lesson.module.css'

/** Look up one item's lesson card from the Levels page. Read-only: no SRS changes. */
export default function ItemPage({ item, onBack }: { item: Item; onBack: () => void }) {
  const { progress, now } = useStore()
  const p = progress.get(item.id)
  const stage = p?.stage ?? 0
  const status =
    stage === 0 ? 'Not learned yet'
    : stage === 9 ? 'Burned'
    : p?.dueAt == null ? STAGES[stage].name
    : p.dueAt <= now ? `${STAGES[stage].name} · review ready`
    : `${STAGES[stage].name} · next review in ${formatIn(p.dueAt - now)}`

  return (
    <div className={ui.screen}>
      <div className={ui.topbar}>
        <button className={ui.iconBtn} onClick={onBack} aria-label="Back to levels"><I.Back /></button>
        <span className={s.step}>{status}</span>
        <span className={`${ui.pill} ${item.kind === 'vocab' ? ui.pillVocab : ui.pillGrammar}`}>{item.kind === 'vocab' ? 'Vocab' : 'Grammar'}</span>
      </div>
      <ItemCard item={item} />
    </div>
  )
}
