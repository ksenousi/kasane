import { beforeEach, describe, expect, it } from 'vitest'
import {
  SignedOut, exportBackup, importBackup, loadAnswers, loadState, login, logout, recordAnswer, resetAll, saveProgress, saveSetting, saveSynonyms,
} from '../src/db'
import { completeLesson, newProgress } from '../src/srs/engine'
import { PASSPHRASE, useApi } from './api-harness'

const NOW = Date.UTC(2026, 8, 27, 12)

const loadProgress = async () => (await loadState()).progress
const loadSettings = async () => (await loadState()).settings
const loadSynonyms = async () => (await loadState()).synonyms

beforeEach(async () => {
  await useApi()
})

describe('sign-in', () => {
  it('refuses data until signed in, and again after signing out', async () => {
    await useApi({ signedIn: false })
    await expect(loadState()).rejects.toBeInstanceOf(SignedOut)
    expect(await login('nope')).toBe(false)
    await expect(saveSetting('lessonBatch', 3)).rejects.toBeInstanceOf(SignedOut)
    expect(await login(PASSPHRASE)).toBe(true)
    expect((await loadState()).settings.lessonBatch).toBe(5)
    await logout()
    await expect(loadState()).rejects.toBeInstanceOf(SignedOut)
  })
})

describe('db', () => {
  it('stores and loads progress by item id', async () => {
    await saveProgress(completeLesson(newProgress('v-gaman'), NOW), newProgress('v-kekka'))
    const map = await loadProgress()
    expect(map.get('v-gaman')?.stage).toBe(1)
    expect(map.get('v-kekka')?.stage).toBe(0)
  })

  it('falls back to default settings and overrides saved keys', async () => {
    expect((await loadSettings()).lessonBatch).toBe(5)
    await saveSetting('lessonBatch', 3)
    expect((await loadSettings()).lessonBatch).toBe(3)
  })

  it('round-trips a backup through export, reset and import', async () => {
    await saveProgress(completeLesson(newProgress('v-gaman'), NOW))
    await recordAnswer({ itemId: 'v-gaman', part: 'meaning', correct: true, at: NOW })
    await saveSetting('lessonBatch', 10)
    const backup = JSON.parse(JSON.stringify(await exportBackup(NOW)))

    await resetAll()
    expect((await loadProgress()).size).toBe(0)

    await importBackup(backup)
    expect((await loadProgress()).get('v-gaman')?.stage).toBe(1)
    expect((await loadSettings()).lessonBatch).toBe(10)
    expect((await exportBackup()).answers).toHaveLength(1)
    expect(await loadAnswers()).toMatchObject([{ itemId: 'v-gaman', part: 'meaning', correct: true, at: NOW }])
  })

  it('saves many progress rows in one go', async () => {
    const rows = Array.from({ length: 1234 }, (_, i) => newProgress(`v-${i}`))
    await saveProgress(...rows)
    expect((await loadProgress()).size).toBe(1234)
    await importBackup(JSON.parse(JSON.stringify(await exportBackup(NOW))))
    expect((await loadProgress()).size).toBe(1234)
  })

  it('rejects files that are not Kasane backups', async () => {
    await expect(importBackup({ hello: 'world' })).rejects.toThrow('Not a Kasane backup')
  })
})

describe('removed content', () => {
  it('ignores saved progress for items that no longer exist', async () => {
    const { currentOnly } = await import('../src/state/store')
    const p = new Map([
      ['v-gaman', completeLesson(newProgress('v-gaman'), NOW)],
      ['v-souzou', completeLesson(newProgress('v-souzou'), NOW)],
    ])
    expect([...currentOnly(p).keys()]).toEqual(['v-gaman'])
  })

  it('saves synonyms, removes empty lists, and round-trips them through a backup', async () => {
    await saveSynonyms('v-gaman', ['grin and bear it'])
    await saveSynonyms('v-setsuyaku', ['thrift'])
    await saveSynonyms('v-setsuyaku', [])
    expect([...(await loadSynonyms())]).toEqual([['v-gaman', ['grin and bear it']]])
    const backup = JSON.parse(JSON.stringify(await exportBackup(NOW)))
    await resetAll()
    expect((await loadSynonyms()).size).toBe(0)
    await importBackup(backup)
    expect((await loadSynonyms()).get('v-gaman')).toEqual(['grin and bear it'])
  })

  it('imports older backups that have no synonyms', async () => {
    await saveSynonyms('v-gaman', ['x'])
    await importBackup({ app: 'kasane', version: 1, exportedAt: NOW, progress: [], answers: [], settings: [] })
    expect((await loadSynonyms()).size).toBe(0)
  })
})
