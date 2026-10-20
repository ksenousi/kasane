import { useEffect, useRef, useState } from 'react'
import { ITEMS, ITEMS_BY_ID } from '../content'
import { loadAnswers, type Answer } from '../db'
import { formatIn } from '../lib/clock'
import { burnsSoon, earliestLevelUp, milestones, passingNext, pastWeek } from '../srs/insights'
import { forecast, hourOf, stageCounts } from '../srs/queue'
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
  const levelUp = earliestLevelUp(ITEMS, level, progress, now)
  const passing = new Map<number, string[]>()
  for (const { item, dueAt } of passingNext(ITEMS, level, progress)) {
    const h = hourOf(hours, dueAt)
    if (h !== null) passing.set(h, [...(passing.get(h) ?? []), item.word])
  }
  // Long-pressing the logo opens layout diagnostics (for iPhone Home Screen quirks).
  const [diag, setDiag] = useState(false)
  const press = useRef<number | undefined>(undefined)
  const pressStart = () => {
    press.current = window.setTimeout(() => setDiag(true), 700)
  }
  const pressEnd = () => window.clearTimeout(press.current)

  return (
    <div className={s.page} data-wide>
      {diag && <Diagnostics onClose={() => setDiag(false)} />}
      <header className={s.header}>
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={40} height={40} className={s.logo} draggable={false} onPointerDown={pressStart} onPointerUp={pressEnd} onPointerLeave={pressEnd} onContextMenu={(e) => e.preventDefault()} />
        <div className={s.titles}>
          <span className={s.title}>Kasane</span>
          <span className={s.sub}>Level {level} · N3</span>
        </div>
        <ReloadButton />
      </header>

      <div className={s.cols}>
      <div className={s.main}>
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
        <Forecast hours={hours} due={reviews.length} nextAt={nextDue?.dueAt ?? null} passing={passing} />
      </section>

      <section className={ui.card}>
        <div className={s.cardHead}>
          <span className={s.cardTitle}>Level {level}</span>
          <span className={s.muted}>Level up at 90% Guru</span>
        </div>
        <Meter label="Words passed" value={passed} max={inLevel.length} color="var(--vocab)" goal={Math.ceil(inLevel.length * 0.9)} />
        {levelUp.at !== null && (
          <div className={s.levelUp}>
            <span className={s.levelUpWhen}>Earliest level-up: {when(levelUp.at, now)}</span>
          </div>
        )}
      </section>
      </div>

      <div className={s.side}>

      <div className={s.stages}>
        <Stage n={counts.apprentice} label="Apprentice" color="var(--st-apprentice)" />
        <Stage n={counts.guru} label="Guru" color="var(--st-guru)" />
        <Stage n={counts.master} label="Master" color="var(--st-master)" />
        <Stage n={counts.enlightened} label="Enlight." color="var(--st-enlightened)" />
        <Stage n={counts.burned} label="Burned" color="var(--st-burned)" />
      </div>
      <PastWeek />
      <ComingUp />
      </div>
      </div>
    </div>
  )
}

/** "today 18:00", "tomorrow 07:00", or "Fri 07:00" within the week, else "23 Oct". */
function when(at: number, now: number): string {
  const d = new Date(at)
  const clock = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days <= 0) return `today ${clock}`
  if (days === 1) return `tomorrow ${clock}`
  if (days < 7) return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${clock}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const pct = (x: number) => `${Math.round(x * 100)}%`

/** What moved this week, and accuracy split into meaning and reading. */
function PastWeek() {
  const { progress, now } = useStore()
  const [answers, setAnswers] = useState<Answer[] | null>(null)
  useEffect(() => {
    loadAnswers().then(setAnswers, () => setAnswers([]))
  }, [])
  const w = pastWeek(progress, answers ?? [], now)
  const moves = [
    { n: w.guru, label: 'reached Guru', color: 'var(--st-guru)' },
    { n: w.master, label: 'reached Master', color: 'var(--st-master)' },
    { n: w.enlightened, label: 'reached Enlightened', color: 'var(--st-enlightened)' },
    { n: w.burned, label: 'burned', color: 'var(--muted)' },
  ].filter((m) => m.n > 0)
  const quiet = !moves.length && !w.dropped && !w.answers
  return (
    <section className={ui.card}>
      <div className={s.cardHead}>
        <span className={s.cardTitle}>Past 7 days</span>
        {w.answers > 0 && <span className={s.muted}>{w.answers} answers</span>}
      </div>
      {quiet ? (
        <p className={`${s.muted} ${s.empty}`}>{answers ? 'No reviews this week yet.' : 'Loading…'}</p>
      ) : (
        <>
          <div className={s.moves}>
            {moves.map((m) => (
              <div key={m.label} className={s.move}><b style={{ color: m.color }}>+{m.n}</b><span>{m.label}</span></div>
            ))}
            {w.dropped > 0 && <div className={s.move}><b style={{ color: 'var(--bad)' }}>−{w.dropped}</b><span>dropped back a stage</span></div>}
          </div>
          {(w.meaning !== null || w.reading !== null) && (
            <div className={s.acc}>
              {w.meaning !== null && <Accuracy label="Meaning" value={w.meaning} color="var(--prompt-meaning-bg)" />}
              {w.reading !== null && <Accuracy label="Reading" value={w.reading} color="var(--vocab)" />}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Accuracy({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={s.accRow}>
      <span>{label}</span>
      <div className={ui.bar}><div className={ui.barFill} style={{ width: pct(value), background: color }} /></div>
      <b>{pct(value)}</b>
    </div>
  )
}

/** Words burning this week, and the next round numbers. */
function ComingUp() {
  const { progress, now } = useStore()
  const burns = burnsSoon(progress, now)
  const goals = milestones(progress, ITEMS.length)
  return (
    <section className={ui.card}>
      <div className={s.cardHead}>
        <span className={s.cardTitle}>Coming up</span>
      </div>
      {burns.length > 0 && (
        <div className={s.list}>
          {burns.map((p) => {
            const item = ITEMS_BY_ID.get(p.itemId)
            return (
              <div key={p.itemId} className={s.li}>
                <span><span className={s.liWord} lang="ja">{item?.word}</span> <span className={s.muted}>{item?.meanings[0]}</span></span>
                <span className={s.muted}>burns {when(p.dueAt!, now)}</span>
              </div>
            )
          })}
        </div>
      )}
      {burns.length > 0 && <div className={s.subhead}>Next milestones</div>}
      <div className={s.list}>
        {goals.map((m) => (
          <div key={m.label} className={s.li}>
            <span>{m.goal} {m.label}</span>
            <span className={s.muted}>{m.goal - m.have} to go</span>
            <div className={`${ui.bar} ${s.liBar}`}><div className={ui.barFill} style={{ width: pct(m.have / m.goal), background: 'var(--st-guru)' }} /></div>
          </div>
        ))}
      </div>
    </section>
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

function Meter({ label, value, max, color, goal }: { label: string; value: number; max: number; color: string; goal?: number }) {
  return (
    <div className={s.meter}>
      <div className={s.meterHead}><span>{label}</span><span className={s.muted}>{value} / {max}</span></div>
      <div className={s.meterTrack}>
        <div className={ui.bar}><div className={ui.barFill} style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} /></div>
        {goal !== undefined && max > 0 && <span className={s.goal} style={{ left: `${(goal / max) * 100}%` }} />}
      </div>
      {goal !== undefined && value < goal && <div className={s.goalNote}>{goal} to level up</div>}
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
