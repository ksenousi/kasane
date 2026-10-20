import { ITEMS_BY_ID } from '../content'
import type { Item } from '../content/schema'
import { GURU, STAGES, stageGroup, type Stage } from '../srs/stages'
import ui from '../ui/ui.module.css'
import type { Move, Summary } from './Session'
import s from './RoundDone.module.css'

interface Props {
  summary: Summary
  /** Reviews still due after this round. */
  left: number
  onMore: () => void
  onDone: () => void
  /** Open a missed word's page. */
  onOpen: (item: Item) => void
}

/** End of a short review round: a quick win, then an easy choice to keep going or stop. */
export default function RoundDone({ summary, left, onMore, onDone, onOpen }: Props) {
  const pct = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0
  return (
    <div className={`${ui.screen} ${s.page}`}>
      <span className={s.emoji} aria-hidden>{pct >= 90 ? '🎉' : pct >= 70 ? '💪' : '🌱'}</span>
      <span className={s.title}>{summary.items} words reviewed</span>
      <div className={s.stats}>
        <Stat n={`${pct}%`} label="correct" />
        <Stat n={`🔥${summary.best}`} label="best streak" />
      </div>
      <Moves moves={summary.moves} onOpen={onOpen} />
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

/** The words missed this round, each with how far it dropped, and a count of what moved. */
function Moves({ moves, onOpen }: { moves: Move[]; onOpen: (item: Item) => void }) {
  const missed = moves.filter((m) => m.missed.length > 0)
  const guru = moves.filter((m) => m.from < GURU && m.to >= GURU).length
  const up = moves.filter((m) => m.to > m.from).length
  const down = moves.filter((m) => m.to < m.from).length
  if (!moves.length) return null
  return (
    <div className={s.moves}>
      {missed.length > 0 && (
        <>
          <span className={s.movesHead}>Missed {missed.length}</span>
          {missed.map((m) => {
            const item = ITEMS_BY_ID.get(m.itemId)
            if (!item) return null
            return (
              <button key={m.itemId} className={s.missed} onClick={() => onOpen(item)}>
                <span className={s.word} lang="ja">{item.word} <span className={s.reading}>{item.reading}</span></span>
                <span className={s.move}><StageName stage={m.from} /> → <StageName stage={m.to} /></span>
                <span className={s.meaning}>{item.meanings[0]} · missed the {m.missed.join(' and ')}</span>
              </button>
            )
          })}
        </>
      )}
      <div className={s.tally}>
        {guru > 0 && <span style={{ color: 'var(--st-guru)' }}>{guru} reached Guru</span>}
        {up > 0 && <span>{up} moved up</span>}
        {down > 0 && <span style={{ color: 'var(--bad)' }}>{down} dropped</span>}
      </div>
    </div>
  )
}

function StageName({ stage }: { stage: Stage }) {
  return <span style={{ color: `var(--st-${stageGroup(stage)})` }}>{STAGES[stage].name}</span>
}
