import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Hour } from '../srs/queue'
import s from './Forecast.module.css'

// The next 24 hours, after Kanigami's forecast:
// - One column per clock hour, no gaps, standing on one hairline baseline.
//   Beneath, the current hour and every third clock hour are named (all 25 don't
//   fit across a phone): bright when reviews arrive, dim when empty, the
//   current hour in the accent. Tapping an hour names it exactly.
// - Each bar carries its count. The current hour holds everything overdue, so it
//   doesn't set the scale: if it outweighs the rest it stops at the top with ↑.
// - From midnight the hours sit on a faint tint behind a dashed rule, under
//   the word "tomorrow".
// - Tapping (or hovering, or arrow keys) an hour reads it out in the line
//   below. At rest that line says what's due now and the day's total.

interface Props {
  hours: Hour[]
  /** Reviews due right now. */
  due: number
  /** When the next review comes due, if nothing is due now. */
  nextAt: number | null
}

export default function Forecast({ hours, due, nextAt }: Props) {
  const [at, setAt] = useState<number | null>(null)
  const group = useRef<HTMLDivElement>(null)

  // A tap outside lets go of the hour being read.
  useEffect(() => {
    if (at === null) return
    const away = (e: PointerEvent) => {
      if (!group.current?.contains(e.target as Node)) setAt(null)
    }
    document.addEventListener('pointerdown', away, true)
    return () => document.removeEventListener('pointerdown', away, true)
  }, [at])

  const busiest = Math.max(1, ...hours.slice(1).map((h) => h.count))
  const today = new Date(hours[0]?.at ?? 0).toDateString()

  const key = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key]
    if (step) {
      e.preventDefault()
      setAt(at === null ? 0 : Math.min(hours.length - 1, Math.max(0, at + step)))
    } else if (e.key === 'Escape') setAt(null)
  }

  return (
    <>
      <div
        ref={group}
        className={s.hours}
        role="group"
        aria-label="Reviews due in each hour of the next day"
        tabIndex={0}
        onKeyDown={key}
        onBlur={() => setAt(null)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setAt(null)}
        style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}
      >
        {hours.map((hour, i) => {
          const capped = i === 0 && hour.count > busiest
          const height = hour.count ? Math.min(hour.count, busiest) / busiest : 0
          const date = new Date(hour.at)
          const nextDay = date.toDateString() !== today
          const midnight = i > 0 && nextDay && date.getHours() === 0
          const named = i === 0 || (date.getHours() % 3 === 0 && i > 1)
          const cls = [
            s.hour,
            hour.count ? s.busy : '',
            i === 0 ? s.now : '',
            nextDay ? s.nextDay : '',
            midnight ? s.midnight : '',
            at === i ? s.reading : '',
            at !== null && at !== i ? s.aside : '',
          ].join(' ')
          return (
            <span
              key={hour.at}
              className={cls}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setAt(i)}
              onPointerDown={(e) => e.pointerType !== 'mouse' && setAt(at === i ? null : i)}
            >
              <span className={s.stack}>
                {midnight && i < hours.length - 3 ? <b className={s.day}>tomorrow</b> : null}
                {hour.count ? (
                  <span className={s.n}>
                    {hour.count}
                    {capped ? '↑' : ''}
                  </span>
                ) : null}
                <i style={{ height: `calc(${height} * var(--tallest))` }} />
              </span>
              <span className={s.at}>{named ? String(date.getHours()).padStart(2, '0') : ''}</span>
            </span>
          )
        })}
      </div>
      <p className={s.readout} aria-live="polite">
        {at === null ? resting(hours, due, nextAt) : reading(hours[at], at, today)}
      </p>
    </>
  )
}

function clock(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function resting(hours: Hour[], due: number, nextAt: number | null): string {
  const total = hours.reduce((sum, h) => sum + h.count, 0)
  if (due > 0) return `${due} due now · ${total - due} more by this time tomorrow`
  if (nextAt === null || total === 0) return 'Nothing due in the next 24 hours'
  return `Nothing due now · next at ${clock(nextAt)} · ${total} by this time tomorrow`
}

function reading(hour: Hour, i: number, today: string): string {
  const when = i === 0 ? 'This hour' : `${clock(hour.at)}${new Date(hour.at).toDateString() !== today ? ' tomorrow' : ''}`
  return `${when} · ${hour.count ? plural(hour.count, 'review') : 'nothing due'}`
}
