import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ITEMS, ITEMS_BY_ID } from '../content'
import type { Item } from '../content/schema'
import {
  DEFAULT_SETTINGS, SignedOut, loadState, login, logout, recordAnswer, saveProgress, saveSetting, saveSynonyms, type Answer, type Settings,
} from '../db'
import { now as clockNow } from '../lib/clock'
import { applyReview, completeLesson, newProgress, type Progress } from '../srs/engine'
import { reviewQueue } from '../srs/queue'
import type { Finished } from '../srs/session'
import { currentLevel, lessonItems } from '../srs/unlock'

interface Store {
  ready: boolean
  /** The server wants the passphrase before it hands over any data. */
  signedOut: boolean
  /** Returns false for a wrong passphrase. */
  signIn: (passphrase: string) => Promise<boolean>
  signOut: () => Promise<void>
  /** The server couldn't be reached when loading; the app shows the offline screen. */
  offline: boolean
  /** Changes made in the app that the server hasn't confirmed yet (kept in memory and retried). */
  unsaved: number
  /** The last attempt to send them failed. */
  saveFailed: boolean
  retrySaves: () => void
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
  addSynonym: (itemId: string, meaning: string) => Promise<void>
  removeSynonym: (itemId: string, meaning: string) => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

/**
 * Drop saved progress for items no longer in the content (e.g. words swapped out
 * because WaniKani covers them), so they don't show up in counts or forecasts.
 * The rows stay in the database and in backups.
 */
/** Away from the app this long, progress is re-read on return. */
const STALE_AFTER = 5 * 60_000

export function currentOnly(p: ReadonlyMap<string, Progress>): Map<string, Progress> {
  return new Map([...p].filter(([id]) => ITEMS_BY_ID.has(id)))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  const [progress, setProgress] = useState<Map<string, Progress>>(new Map())
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [synonyms, setSynonyms] = useState<Map<string, string[]>>(new Map())
  const [now, setNow] = useState(clockNow)
  const [offline, setOffline] = useState(false)
  const [unsaved, setUnsaved] = useState(0)
  const [saveFailed, setSaveFailed] = useState(false)

  // Writes go out one at a time, in order. The app updates straight away; a write that
  // fails stays at the front of the queue until a retry gets it through.
  const queue = useRef<(() => Promise<unknown>)[]>([])
  const flushing = useRef<Promise<boolean> | null>(null)

  /** Sends queued writes. Resolves true once the queue is empty. */
  const flush = useCallback((): Promise<boolean> => {
    if (flushing.current) return flushing.current
    const run = (async () => {
      try {
        while (queue.current.length) {
          await queue.current[0]()
          queue.current.shift()
          setUnsaved(queue.current.length)
        }
        setSaveFailed(false)
        return true
      } catch (e) {
        if (e instanceof SignedOut) setSignedOut(true)
        else setSaveFailed(true)
        return false
      }
    })()
    // Cleared once it settles (not inside it: with nothing queued it finishes before this line).
    flushing.current = run
    void run.then(() => {
      if (flushing.current === run) flushing.current = null
    })
    return run
  }, [])

  const save = useCallback(
    (write: () => Promise<unknown>) => {
      queue.current.push(write)
      setUnsaved(queue.current.length)
      void flush()
    },
    [flush],
  )

  const refresh = useCallback(async () => {
    // Loading now would show the server's older copy, so send pending changes first.
    if (!(await flush())) return
    try {
      const s = await loadState()
      setProgress(currentOnly(s.progress))
      setSettings(s.settings)
      setSynonyms(s.synonyms)
      setSignedOut(false)
      setOffline(false)
    } catch (e) {
      if (e instanceof SignedOut) setSignedOut(true)
      else setOffline(true)
    }
    setNow(clockNow())
    setReady(true)
  }, [flush])

  const signIn = useCallback(
    async (passphrase: string) => {
      if (!(await login(passphrase))) return false
      setSignedOut(false)
      await refresh()
      return true
    },
    [refresh],
  )

  const signOut = useCallback(async () => {
    await logout()
    setSignedOut(true)
  }, [])

  // When the connection comes back, retry whatever was waiting.
  const offlineRef = useRef(offline)
  useEffect(() => {
    offlineRef.current = offline
  }, [offline])
  useEffect(() => {
    const onOnline = () => void (offlineRef.current ? refresh() : flush())
    // Warn before closing the app with changes the server doesn't have yet.
    const onLeave = (e: BeforeUnloadEvent) => {
      if (queue.current.length) e.preventDefault()
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('beforeunload', onLeave)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('beforeunload', onLeave)
    }
  }, [refresh, flush])

  const retrySaves = useCallback(() => void flush(), [flush])

  useEffect(() => {
    void refresh()
    // Keep counts fresh while the app stays open. Coming back after a while (another device may
    // have done reviews meanwhile) reloads progress too, so the Reload button isn't needed for that.
    const tick = () => setNow(clockNow())
    let hiddenAt: number | null = null
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
        return
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= STALE_AFTER) void refresh()
      else tick()
      hiddenAt = null
    }
    const id = window.setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  const put = useCallback(async (rows: Progress[]) => {
    save(() => saveProgress(...rows))
    setProgress((prev) => {
      const next = new Map(prev)
      for (const r of rows) next.set(r.itemId, r)
      return next
    })
    setNow(clockNow())
  }, [save])

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
    const at = clockNow()
    save(() => recordAnswer({ ...a, at }))
  }, [save])

  const setSetting = useCallback(async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    save(() => saveSetting(key, value))
    setSettings((s) => ({ ...s, [key]: value }))
  }, [save])

  const writeSynonyms = useCallback(async (itemId: string, update: (list: string[]) => string[]) => {
    const list = update(synonyms.get(itemId) ?? [])
    save(() => saveSynonyms(itemId, list))
    setSynonyms((prev) => {
      const next = new Map(prev)
      if (list.length) next.set(itemId, list)
      else next.delete(itemId)
      return next
    })
  }, [synonyms, save])

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
      signedOut,
      signIn,
      signOut,
      offline,
      unsaved,
      saveFailed,
      retrySaves,
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
      addSynonym,
      removeSynonym,
    }
  }, [ready, signedOut, signIn, signOut, offline, unsaved, saveFailed, retrySaves, now, progress, settings, synonyms, refresh, completeLessons, finishReview, logAnswer, setSetting, addSynonym, removeSynonym])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
