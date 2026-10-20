import { useRef, useState } from 'react'
import { ITEMS } from '../content'
import { formatIn } from '../lib/clock'
import { forecast, stageCounts } from '../srs/queue'
import { useStore } from '../state/store'
import { ROUND } from './RoundDone'
import Diagnostics from '../ui/Diagnostics'
import Forecast from './Forecast'
import * as I from '../ui/icons'
import ui from '../ui/ui.module.css'
import s from './Home.module.css'

interface Props {
  onLessons: () => void
  onReviews: () => void
}

export default function Home({ onLessons, onReviews }: Props) {
  const { progress, level, lessons, reviews, now, settings } = useStore()
  const all = [...progress.values()]
  const hours = forecast(all, now)
  const nextDue = all.filter((p) => p.dueAt !== null && p.dueAt > now && p.stage > 0 && p.stage < 9).sort((a, b) => a.dueAt! - b.dueAt!)[0]
  const counts = stageCounts(all.filter((p) => p.stage > 0))

  const inLevel = ITEMS.filter((i) => i.level === level)
  const passed = inLevel.filter((i) => progress.get(i.id)?.passedAt != null).length
  // Long-pressing the logo opens layout diagnostics (for iPhone Home Screen quirks).
  const [diag, setDiag] = useState(false)
  const press = useRef<number | undefined>(undefined)
  const pressStart = () => {
    press.current = window.setTimeout(() => setDiag(true), 700)
  }
  const pressEnd = () => window.clearTimeout(press.current)

  return (
    <div className={s.page}>
      {diag && <Diagnostics onClose={() => setDiag(false)} />}
      <header className={s.header}>
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={40} height={40} className={s.logo} draggable={false} onPointerDown={pressStart} onPointerUp={pressEnd} onPointerLeave={pressEnd} onContextMenu={(e) => e.preventDefault()} />
        <div className={s.titles}>
          <span className={s.title}>Kasane</span>
          <span className={s.sub}>Level {level} · N3</span>
        </div>
        <ReloadButton />
      </header>

      <NextUp
        reviews={reviews.length}
        lessons={Math.min(lessons.length, settings.lessonBatch)}
        nextIn={nextDue ? formatIn(nextDue.dueAt! - now) : null}
        onLessons={onLessons}
        onReviews={onReviews}
      />

      <section className={ui.card}>
        <div className={s.cardHead}>
          <span className={s.cardTitle}>Next 24 hours</span>
        </div>
        <Forecast hours={hours} due={reviews.length} nextAt={nextDue?.dueAt ?? null} />
      </section>

      <section className={ui.card}>
        <div className={s.cardHead}>
          <span className={s.cardTitle}>Level {level}</span>
          <span className={s.muted}>Level up at 90% Guru</span>
        </div>
        <Meter label="Words passed" value={passed} max={inLevel.length} color="var(--vocab)" />
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

/**
 * One obvious thing to do next, sized to a couple of minutes. Reviews come first (they decay);
 * lessons are the secondary button when both are waiting.
 */
function NextUp({ reviews, lessons, nextIn, onLessons, onReviews }: { reviews: number; lessons: number; nextIn: string | null; onLessons: () => void; onReviews: () => void }) {
  const round = Math.min(reviews, ROUND)
  const lessonBtn = lessons > 0 && (
    <button className={reviews ? s.alt : s.hero} onClick={onLessons}>
      {reviews ? <>Or learn {lessons} new words</> : <HeroText label="Next up" title={`Learn ${lessons} new words`} sub={`about ${Math.max(2, Math.round(lessons * 0.8))} min`} />}
    </button>
  )
  if (reviews) {
    return (
      <div className={s.next}>
        <button className={s.hero} onClick={onReviews}>
          <HeroText label="Next up" title={`Review ${round} words`} sub={`about ${Math.max(1, Math.round(round * 0.2))} min${reviews > round ? ` · ${reviews} due in total` : ''}`} />
        </button>
        {lessonBtn}
      </div>
    )
  }
  if (lessons) return <div className={s.next}>{lessonBtn}</div>
  return (
    <div className={`${s.hero} ${s.heroIdle}`}>
      <HeroText label="All caught up ✓" title="Nothing to do right now" sub={nextIn ? `Next reviews in ${nextIn}` : 'Come back later'} />
    </div>
  )
}

function HeroText({ label, title, sub }: { label: string; title: string; sub: string }) {
  return (
    <>
      <span className={s.heroLabel}>{label}</span>
      <span className={s.heroTitle}>{title}</span>
      <span className={s.heroSub}>{sub}</span>
    </>
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
