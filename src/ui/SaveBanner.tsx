import { useStore } from '../state/store'
import s from './SaveBanner.module.css'

/** Floats over every screen while changes are waiting to reach the server after a failed save. */
export default function SaveBanner() {
  const { unsaved, saveFailed, retrySaves } = useStore()
  if (!saveFailed || !unsaved) return null
  return (
    <div className={s.banner} role="alert">
      <span className={s.text}>
        {unsaved === 1 ? '1 change isn’t' : `${unsaved} changes aren’t`} saved yet. Check your connection, and keep the app open.
      </span>
      <button className={s.retry} onClick={retrySaves}>Retry</button>
    </div>
  )
}
