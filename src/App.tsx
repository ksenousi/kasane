import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Item } from './content/schema'
import Home from './screens/Home'
import Lesson from './screens/Lesson'
import ItemPage from './screens/ItemPage'
import Grammar from './screens/Grammar'
import Levels from './screens/Levels'
import Session from './screens/Session'
import Settings from './screens/Settings'
import WeakSpots from './screens/WeakSpots'
import { useStore } from './state/store'
import * as I from './ui/icons'
import ui from './ui/ui.module.css'

type Tab = 'home' | 'levels' | 'grammar' | 'weak' | 'settings'
type Screen = { name: Tab } | { name: 'lesson' } | { name: 'review' } | { name: 'drill'; items: Item[] } | { name: 'item'; item: Item }

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <I.Home /> },
  { id: 'levels', label: 'Levels', icon: <I.Levels /> },
  { id: 'grammar', label: 'Grammar', icon: <I.Book /> },
  { id: 'weak', label: 'Weak spots', icon: <I.Target /> },
  { id: 'settings', label: 'Settings', icon: <I.Gear /> },
]

export default function App() {
  const { ready, reviews, finishReview } = useStore()
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const home = () => setScreen({ name: 'home' })
  // Coming back from an item page, return to the same spot in the Levels list.
  const levelsScroll = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (screen.name === 'item') window.scrollTo(0, 0)
    if (screen.name === 'levels' && levelsScroll.current !== null) {
      window.scrollTo(0, levelsScroll.current)
      levelsScroll.current = null
    }
  }, [screen])

  if (!ready) return null

  if (screen.name === 'lesson') return <Lesson onExit={home} />
  if (screen.name === 'review') {
    return <Session items={reviews} mode="review" onExit={home} onComplete={home} onFinished={(f) => void finishReview(f)} />
  }

  if (screen.name === 'item') return <ItemPage item={screen.item} onBack={() => setScreen({ name: 'levels' })} />

  if (screen.name === 'drill') {
    const back = () => setScreen({ name: 'weak' })
    return <Session items={screen.items} mode="drill" onExit={back} onComplete={back} />
  }

  return (
    <div className={`${ui.screen} ${ui.tabScreen}`}>
      {screen.name === 'home' && <Home onLessons={() => setScreen({ name: 'lesson' })} onReviews={() => setScreen({ name: 'review' })} />}
      {screen.name === 'levels' && <Levels
          onOpen={(item) => {
            levelsScroll.current = window.scrollY
            setScreen({ name: 'item', item })
          }}
        />}
      {screen.name === 'grammar' && <Grammar />}
      {screen.name === 'weak' && <WeakSpots onDrill={(items) => setScreen({ name: 'drill', items })} />}
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
