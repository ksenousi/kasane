import { useState } from 'react'
import { ITEMS } from '../content'
import { formatIn } from '../lib/clock'
import { forecast, stageCounts } from '../srs/queue'
import { useStore } from '../state/store'
import * as I from '../ui/icons'
import ui from '../ui/ui.module.css'
import s from './Home.module.css'

interface Props {
  onLessons: () => void
  onReviews: () => void
}

export default function Home({ onLessons, onReviews }: Props) {
  const { progress, level, lessons, reviews, now } = useStore()
  const all = [...progress.values()]
  const hours = forecast(all, now, 24)
  const upcoming = hours.slice(1).reduce((a, b) => a + b, 0)
  const nextDue = all.filter((p) => p.dueAt !== null && p.dueAt > now && p.stage > 0 && p.stage < 9).sort((a, b) => a.dueAt! - b.dueAt!)[0]
  const peak = Math.max(1, ...hours)
  const counts = stageCounts(all.filter((p) => p.stage > 0))

  const inLevel = ITEMS.filter((i) => i.level === level)
  const passed = (kind: 'vocab' | 'grammar') => inLevel.filter((i) => i.kind === kind && progress.get(i.id)?.passedAt != null).length
  const total = (kind: 'vocab' | 'grammar') => inLevel.filter((i) => i.kind === kind).length
  const lessonVocab = lessons.filter((i) => i.kind === 'vocab').length

  return (
    <div className={s.page}>
      <header className={s.header}>
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={40} height={40} className={s.logo} />
        <div className={s.titles}>
          <span className={s.title}>Kasane</span>
          <span className={s.sub}>Level {level} · N3</span>
        </div>
        <ReloadButton />
      </header>

      <div className={s.big}>
        <button className={s.lessons} onClick={onLessons} disabled={lessons.length === 0}>
          <span className={s.bigLabel}>Lessons</span>
          <span className={s.bigNum}>{lessons.length}</span>
          <span className={s.bigSub}>{lessons.length ? `${lessonVocab} vocab · ${lessons.length - lessonVocab} grammar` : 'All caught up'}</span>
        </button>
        <button className={s.reviews} onClick={onReviews} disabled={reviews.length === 0}>
          <span className={s.bigLabel}>Reviews</span>
          <span className={s.bigNum}>{reviews.length}</span>
          <span className={s.bigSub}>{reviews.length ? 'Ready now' : nextDue ? `Next in ${formatIn(nextDue.dueAt! - now)}` : 'None yet'}</span>
        </button>
      </div>

      <section className={ui.card}>
        <div className={s.cardHead}>
          <span className={s.cardTitle}>Next 24 hours</span>
          <span className={s.muted}>{upcoming} coming up</span>
        </div>
        <div className={s.bars} aria-label={`Reviews by hour: ${hours.join(', ')}`}>
          {hours.map((n, i) => (
            <div key={i} className={s.barCol}>
              <div className={`${s.hourBar} ${i === 0 && n > 0 ? s.now : ''}`} style={{ height: `${Math.max(4, (n / peak) * 100)}%`, opacity: n ? 1 : 0.35 }} />
            </div>
          ))}
        </div>
        <div className={s.axis}><span>Now</span><span>+12h</span><span>+24h</span></div>
      </section>

      <section className={ui.card}>
        <div className={s.cardHead}>
          <span className={s.cardTitle}>Level {level}</span>
          <span className={s.muted}>Level up at 90% Guru</span>
        </div>
        <Meter label="Vocab" value={passed('vocab')} max={total('vocab')} color="var(--vocab)" />
        <Meter label="Grammar" value={passed('grammar')} max={total('grammar')} color="var(--grammar)" />
      </section>

      <div className={s.stages}>
        <Stage n={counts.apprentice} label="Apprentice" color="var(--st-apprentice)" />
        <Stage n={counts.guru} label="Guru" color="var(--st-guru)" />
        <Stage n={counts.master} label="Master" color="var(--st-master)" />
        <Stage n={counts.enlightened} label="Enlight." color="var(--st-enlightened)" />
        <Stage n={counts.burned} label="Burned" color="var(--st-burned)" />
      </div>
    </div>
  )
}

/** Full reload: picks up a new app version if one is out, and re-reads progress from storage. */
function ReloadButton() {
  const [busy, setBusy] = useState(false)
  async function reload() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      await reg?.update()
    } catch {
      // Offline or no service worker: a plain reload still re-reads progress.
    }
    window.location.reload()
  }
  return (
    <button className={`${ui.iconBtn} ${s.reload} ${busy ? s.spin : ''}`} onClick={reload} disabled={busy} aria-label="Reload">
      <I.Refresh />
    </button>
  )
}

function Meter({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className={s.meter}>
      <div className={s.meterHead}><span>{label}</span><span className={s.muted}>{value} / {max}</span></div>
      <div className={ui.bar}><div className={ui.barFill} style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} /></div>
    </div>
  )
}

function Stage({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className={s.stage} style={{ borderTopColor: color }}>
      <span className={s.stageN}>{n}</span>
      <span className={s.stageL}>{label}</span>
    </div>
  )
}
