import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ITEMS, ITEMS_BY_ID } from '../content'
import type { Item } from '../content/schema'
import {
  DEFAULT_SETTINGS, loadProgress, loadSettings, loadSynonyms, recordAnswer, saveProgress, saveSetting, saveSynonyms, type Answer, type Settings,
} from '../db'
import { now as clockNow } from '../lib/clock'
import { applyReview, completeLesson, newProgress, type Progress } from '../srs/engine'
import { reviewQueue } from '../srs/queue'
import type { Finished } from '../srs/session'
import { currentLevel, lessonItems } from '../srs/unlock'

interface Store {
  ready: boolean
  now: number
  progress: ReadonlyMap<string, Progress>
  settings: Settings
  /** The user's own extra meanings, by item id. */
  synonyms: ReadonlyMap<string, string[]>
  level: number
  lessons: Item[]
  reviews: Item[]
  refresh: () => Promise<void>
  completeLessons: (ids: string[]) => Promise<void>
  finishReview: (f: Finished) => Promise<void>
  logAnswer: (a: Omit<Answer, 'id' | 'at'>) => void
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
  /** Toggle a grammar point in the "already known" list. Safe to call several times in a row. */
  toggleKnownGrammar: (pattern: string) => Promise<void>
  addSynonym: (itemId: string, meaning: string) => Promise<void>
  removeSynonym: (itemId: string, meaning: string) => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

/**
 * Drop saved progress for items no longer in the content (e.g. words swapped out
 * because WaniKani covers them), so they don't show up in counts or forecasts.
 * The rows stay in the database and in backups.
 */
export function currentOnly(p: ReadonlyMap<string, Progress>): Map<string, Progress> {
  return new Map([...p].filter(([id]) => ITEMS_BY_ID.has(id)))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState<Map<string, Progress>>(new Map())
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [synonyms, setSynonyms] = useState<Map<string, string[]>>(new Map())
  const [now, setNow] = useState(clockNow)

  const refresh = useCallback(async () => {
    const [p, s, syn] = await Promise.all([loadProgress(), loadSettings(), loadSynonyms()])
    setProgress(currentOnly(p))
    setSettings(s)
    setSynonyms(syn)
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
      await put([applyReview(p, f.misses, t)])
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

  // The latest known-grammar list, updated synchronously so quick taps build on each other.
  const knownRef = useRef<string[]>(settings.knownGrammar)
  useEffect(() => {
    knownRef.current = settings.knownGrammar
  }, [settings.knownGrammar])

  const toggleKnownGrammar = useCallback(async (pattern: string) => {
    const list = knownRef.current
    const next = list.includes(pattern) ? list.filter((x) => x !== pattern) : [...list, pattern]
    knownRef.current = next
    setSettings((s) => ({ ...s, knownGrammar: next }))
    await saveSetting('knownGrammar', next)
  }, [])

  const writeSynonyms = useCallback(async (itemId: string, update: (list: string[]) => string[]) => {
    const list = update(synonyms.get(itemId) ?? [])
    await saveSynonyms(itemId, list)
    setSynonyms((prev) => {
      const next = new Map(prev)
      if (list.length) next.set(itemId, list)
      else next.delete(itemId)
      return next
    })
  }, [synonyms])

  const addSynonym = useCallback(
    (itemId: string, meaning: string) => {
      const m = meaning.trim().replace(/\s+/g, ' ')
      return writeSynonyms(itemId, (list) => (m && !list.some((x) => x.toLowerCase() === m.toLowerCase()) ? [...list, m] : list))
    },
    [writeSynonyms],
  )

  const removeSynonym = useCallback(
    (itemId: string, meaning: string) => writeSynonyms(itemId, (list) => list.filter((x) => x !== meaning)),
    [writeSynonyms],
  )

  const value = useMemo<Store>(() => {
    return {
      ready,
      now,
      progress,
      settings,
      synonyms,
      level: currentLevel(ITEMS, progress),
      lessons: lessonItems(ITEMS, progress),
      reviews: reviewQueue(ITEMS, progress, now),
      refresh,
      completeLessons,
      finishReview,
      logAnswer,
      setSetting,
      toggleKnownGrammar,
      addSynonym,
      removeSynonym,
    }
  }, [ready, now, progress, settings, synonyms, refresh, completeLessons, finishReview, logAnswer, setSetting, toggleKnownGrammar, addSynonym, removeSynonym])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
