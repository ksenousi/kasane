import { useRef, useState } from 'react'
import { exportBackup, importBackup, resetAll } from '../db'
import { advanceClock, resetClock } from '../lib/clock'
import { useStore } from '../state/store'
import ui from '../ui/ui.module.css'
import s from './Settings.module.css'

const HOUR = 3_600_000

export default function Settings() {
  const { settings, setSetting, refresh } = useStore()
  const [msg, setMsg] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  async function doExport() {
    const data = await exportBackup()
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const name = `kasane-backup-${new Date().toISOString().slice(0, 10)}.json`
    const f = new File([blob], name, { type: 'application/json' })
    // iOS: the share sheet offers "Save to Files". Elsewhere, download.
    if (navigator.canShare?.({ files: [f] })) {
      await navigator.share({ files: [f] }).catch(() => undefined)
    } else {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      URL.revokeObjectURL(a.href)
    }
    setMsg('Backup created.')
  }

  async function doImport(f: File) {
    try {
      await importBackup(JSON.parse(await f.text()))
      await refresh()
      setMsg('Backup restored.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not read that file.')
    }
  }

  async function doReset() {
    if (!window.confirm('Erase all progress? This cannot be undone unless you have a backup.')) return
    await resetAll()
    await refresh()
    setMsg('Progress erased.')
  }

  async function shiftClock(ms: number | null) {
    if (ms === null) resetClock()
    else advanceClock(ms)
    await refresh()
  }

  return (
    <div className={s.page}>
      <span className={s.title}>Settings</span>

      <section className={ui.card}>
        <label className={s.row}>
          <div className={s.text}>
            <span>Recall cards for Master+</span>
            <span className={s.hint}>Items at Master and above show a flip card you grade yourself, instead of a question.</span>
          </div>
          <input type="checkbox" className={s.toggle} checked={settings.flipMode} onChange={(e) => void setSetting('flipMode', e.target.checked)} />
        </label>
        <div className={s.row}>
          <div className={s.text}>
            <span>Lesson batch size</span>
            <span className={s.hint}>New items per lesson before the quiz.</span>
          </div>
          <div className={s.seg} role="group" aria-label="Lesson batch size">
            {[3, 5, 10].map((n) => (
              <button key={n} className={settings.lessonBatch === n ? s.segOn : ''} onClick={() => void setSetting('lessonBatch', n)} aria-pressed={settings.lessonBatch === n}>{n}</button>
            ))}
          </div>
        </div>
      </section>

      <section className={ui.card}>
        <span className={ui.label}>Backup</span>
        <p className={s.hint}>Your progress lives only on this phone. Save a backup now and then (Files, iCloud Drive…).</p>
        <div className={s.buttons}>
          <button className={ui.btnGhost} onClick={() => void doExport()}>Save backup</button>
          <button className={ui.btnGhost} onClick={() => file.current?.click()}>Restore…</button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && void doImport(e.target.files[0])} />
        <button className={s.danger} onClick={() => void doReset()}>Erase all progress</button>
      </section>

      {import.meta.env.DEV && (
        <section className={ui.card}>
          <span className={ui.label}>Dev · time machine</span>
          <div className={s.buttons}>
            <button className={ui.btnGhost} onClick={() => void shiftClock(4 * HOUR)}>+4h</button>
            <button className={ui.btnGhost} onClick={() => void shiftClock(24 * HOUR)}>+1d</button>
            <button className={ui.btnGhost} onClick={() => void shiftClock(7 * 24 * HOUR)}>+1w</button>
            <button className={ui.btnGhost} onClick={() => void shiftClock(null)}>Reset</button>
          </div>
        </section>
      )}

      {msg && <p className={s.msg} role="status">{msg}</p>}
      <p className={s.about}>Kasane · vocab list based on Tanos (CC BY) via open-anki-jlpt-decks</p>
    </div>
  )
}
