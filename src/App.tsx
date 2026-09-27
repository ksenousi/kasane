import { useState, type ReactNode } from 'react'
import Home from './screens/Home'
import Lesson from './screens/Lesson'
import Levels from './screens/Levels'
import Session from './screens/Session'
import Settings from './screens/Settings'
import WeakSpots from './screens/WeakSpots'
import { useStore } from './state/store'
import * as I from './ui/icons'
import ui from './ui/ui.module.css'

type Tab = 'home' | 'levels' | 'weak' | 'settings'
type Screen = { name: Tab } | { name: 'lesson' } | { name: 'review' }

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <I.Home /> },
  { id: 'levels', label: 'Levels', icon: <I.Levels /> },
  { id: 'weak', label: 'Weak spots', icon: <I.Target /> },
  { id: 'settings', label: 'Settings', icon: <I.Gear /> },
]

export default function App() {
  const { ready, reviews, finishReview } = useStore()
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const home = () => setScreen({ name: 'home' })

  if (!ready) return null

  if (screen.name === 'lesson') return <Lesson onExit={home} />
  if (screen.name === 'review') {
    return <Session items={reviews} mode="review" onExit={home} onComplete={home} onFinished={(f) => void finishReview(f)} />
  }

  return (
    <div className={ui.screen}>
      {screen.name === 'home' && <Home onLessons={() => setScreen({ name: 'lesson' })} onReviews={() => setScreen({ name: 'review' })} />}
      {screen.name === 'levels' && <Levels />}
      {screen.name === 'weak' && <WeakSpots />}
      {screen.name === 'settings' && <Settings />}
      <nav className={ui.tabs}>
        {TABS.map((t) => (
          <button key={t.id} className={`${ui.tab} ${screen.name === t.id ? ui.tabActive : ''}`} onClick={() => setScreen({ name: t.id })} aria-current={screen.name === t.id ? 'page' : undefined}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
