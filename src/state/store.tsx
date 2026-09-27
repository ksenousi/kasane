import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ITEMS } from '../content'
import type { Item } from '../content/schema'
import {
  DEFAULT_SETTINGS, loadProgress, loadSettings, recordAnswer, saveProgress, saveSetting, type Answer, type Settings,
} from '../db'
import { now as clockNow } from '../lib/clock'
import { applyReview, completeLesson, holdReview, newProgress, type Progress } from '../srs/engine'
import { reviewQueue } from '../srs/queue'
import type { Finished } from '../srs/session'
import { currentLevel, lessonItems } from '../srs/unlock'

interface Store {
  ready: boolean
  now: number
  progress: ReadonlyMap<string, Progress>
  settings: Settings
  level: number
  lessons: Item[]
  reviews: Item[]
  refresh: () => Promise<void>
  completeLessons: (ids: string[]) => Promise<void>
  finishReview: (f: Finished) => Promise<void>
  logAnswer: (a: Omit<Answer, 'id' | 'at'>) => void
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState<Map<string, Progress>>(new Map())
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [now, setNow] = useState(clockNow)

  const refresh = useCallback(async () => {
    const [p, s] = await Promise.all([loadProgress(), loadSettings()])
    setProgress(p)
    setSettings(s)
    setNow(clockNow())
    setReady(true)
  }, [])

  useEffect(() => {
    void refresh()
    // Keep counts fresh while the app stays open, and when it returns from the background.
    const tick = () => setNow(clockNow())
    const id = window.setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [refresh])

  const put = useCallback(async (rows: Progress[]) => {
    await saveProgress(...rows)
    setProgress((prev) => {
      const next = new Map(prev)
      for (const r of rows) next.set(r.itemId, r)
      return next
    })
    setNow(clockNow())
  }, [])

  const completeLessons = useCallback(
    async (ids: string[]) => {
      const t = clockNow()
      await put(ids.map((id) => completeLesson(progress.get(id) ?? newProgress(id), t)))
    },
    [progress, put],
  )

  const finishReview = useCallback(
    async (f: Finished) => {
      const p = progress.get(f.itemId)
      if (!p) return
      const t = clockNow()
      await put([f.held && f.misses === 0 ? holdReview(p, t) : applyReview(p, f.misses, t)])
    },
    [progress, put],
  )

  const logAnswer = useCallback((a: Omit<Answer, 'id' | 'at'>) => {
    void recordAnswer({ ...a, at: clockNow() })
  }, [])

  const setSetting = useCallback(async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    await saveSetting(key, value)
    setSettings((s) => ({ ...s, [key]: value }))
  }, [])

  const value = useMemo<Store>(() => {
    return {
      ready,
      now,
      progress,
      settings,
      level: currentLevel(ITEMS, progress),
      lessons: lessonItems(ITEMS, progress),
      reviews: reviewQueue(ITEMS, progress, now),
      refresh,
      completeLessons,
      finishReview,
      logAnswer,
      setSetting,
    }
  }, [ready, now, progress, settings, refresh, completeLessons, finishReview, logAnswer, setSetting])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
