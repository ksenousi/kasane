import { useState } from 'react'
import { useStore } from '../state/store'
import ui from '../ui/ui.module.css'
import s from './Login.module.css'

/** Shown when the server can't be reached at start-up. Progress lives online, so there's nothing to show. */
export default function Offline() {
  const { refresh } = useStore()
  const [busy, setBusy] = useState(false)

  async function retry() {
    setBusy(true)
    await refresh()
    setBusy(false)
  }

  return (
    <div className={ui.screen}>
      <div className={s.page}>
        <span className={s.title}>You’re offline</span>
        <p className={s.hint}>Kasane keeps your progress online, so it needs a connection. It will load as soon as you’re back online.</p>
        <button className={ui.btn} onClick={() => void retry()} disabled={busy}>
          {busy ? 'Trying…' : 'Try again'}
        </button>
      </div>
    </div>
  )
}
