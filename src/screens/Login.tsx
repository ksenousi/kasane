import { useState, type FormEvent } from 'react'
import { useStore } from '../state/store'
import ui from '../ui/ui.module.css'
import s from './Login.module.css'

export default function Login() {
  const { signIn } = useStore()
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!passphrase || busy) return
    setBusy(true)
    setError('')
    try {
      if (!(await signIn(passphrase))) setError('Wrong passphrase.')
    } catch {
      setError('Couldn’t reach the server. Check your connection.')
    }
    setBusy(false)
  }

  return (
    <div className={ui.screen}>
      <form className={s.page} onSubmit={(e) => void submit(e)}>
        <span className={s.title}>Kasane</span>
        <p className={s.hint}>Enter your passphrase to load your progress.</p>
        {/* A hidden username lets password managers save the passphrase. */}
        <input type="text" name="username" autoComplete="username" value="kasane" readOnly hidden />
        <input
          className={s.input}
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoFocus
        />
        {error && <p className={s.error}>{error}</p>}
        <button className={ui.btn} type="submit" disabled={busy || !passphrase}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
