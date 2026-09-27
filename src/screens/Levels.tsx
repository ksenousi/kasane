import { LEVELS, itemLabel } from '../content'
import { stageGroup } from '../srs/stages'
import { LEVEL_UP_FRACTION, passedFraction } from '../srs/unlock'
import { ITEMS } from '../content'
import { useStore } from '../state/store'
import ui from '../ui/ui.module.css'
import s from './Levels.module.css'

const GROUP_COLOR = {
  lesson: 'var(--s2)',
  apprentice: 'var(--st-apprentice)',
  guru: 'var(--st-guru)',
  master: 'var(--st-master)',
  enlightened: 'var(--st-enlightened)',
  burned: 'var(--st-burned)',
} as const

export default function Levels() {
  const { progress, level } = useStore()
  return (
    <div className={s.page}>
      <div className={s.head}>
        <span className={ui.label}>N3 path · {LEVELS.length} level{LEVELS.length === 1 ? '' : 's'} so far</span>
        <span className={s.title}>Levels</span>
      </div>
      {LEVELS.map((l) => {
        const pct = Math.round(passedFraction(ITEMS, l.level, progress) * 100)
        const locked = l.level > level
        return (
          <section key={l.level} className={`${ui.card} ${l.level === level ? s.current : ''} ${locked ? s.locked : ''}`}>
            <div className={s.row}>
              <span className={s.name}>Level {l.level}{l.level === level ? ' · current' : ''}</span>
              <span className={s.muted}>{locked ? `Unlocks at ${LEVEL_UP_FRACTION * 100}% of level ${l.level - 1}` : `${pct}% passed`}</span>
            </div>
            {!locked &&
              (['vocab', 'grammar'] as const).map((kind) => (
                <div key={kind} className={s.group}>
                  <span className={ui.label}>{kind === 'vocab' ? 'Vocab' : 'Grammar'}</span>
                  <div className={s.chips} lang="ja">
                    {l.items.filter((i) => i.kind === kind).map((i) => {
                      const g = stageGroup(progress.get(i.id)?.stage ?? 0)
                      return (
                        <span key={i.id} className={`${s.chip} ${g === 'lesson' ? s.new : ''}`} style={{ background: GROUP_COLOR[g] }}>
                          {itemLabel(i)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
          </section>
        )
      })}
      <div className={s.legend}>
        {(['apprentice', 'guru', 'master', 'enlightened', 'burned'] as const).map((g) => (
          <span key={g}><i style={{ background: GROUP_COLOR[g] }} />{g[0].toUpperCase() + g.slice(1)}</span>
        ))}
        <span><i style={{ background: GROUP_COLOR.lesson }} />Not learned</span>
      </div>
    </div>
  )
}
