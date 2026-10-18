import ui from '../ui/ui.module.css'
import type { Summary } from './Session'
import s from './RoundDone.module.css'

interface Props {
  summary: Summary
  /** Reviews still due after this round. */
  left: number
  onMore: () => void
  onDone: () => void
}

/** End of a short review round: a quick win, then an easy choice to keep going or stop. */
export default function RoundDone({ summary, left, onMore, onDone }: Props) {
  const pct = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0
  return (
    <div className={`${ui.screen} ${s.page}`}>
      <span className={s.emoji} aria-hidden>{pct >= 90 ? '🎉' : pct >= 70 ? '💪' : '🌱'}</span>
      <span className={s.title}>{summary.items} words reviewed</span>
      <div className={s.stats}>
        <Stat n={`${pct}%`} label="correct" />
        <Stat n={`🔥${summary.best}`} label="best streak" />
      </div>
      <div className={s.actions}>
        {left > 0 && <button className={ui.btn} onClick={onMore}>{Math.min(left, ROUND)} more · {left} left</button>}
        <button className={left > 0 ? ui.btnGhost : ui.btn} onClick={onDone}>{left > 0 ? 'Done for now' : 'All caught up · Home'}</button>
      </div>
    </div>
  )
}

/** Reviews per round. Short rounds keep each sitting a couple of minutes long. */
export const ROUND = 10

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className={s.stat}>
      <span className={s.statN}>{n}</span>
      <span className={s.statL}>{label}</span>
    </div>
  )
}
