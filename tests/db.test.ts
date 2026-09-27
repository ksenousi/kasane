import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  exportBackup, importBackup, loadProgress, loadSettings, recordAnswer, resetAll, saveProgress, saveSetting,
} from '../src/db'
import { completeLesson, newProgress } from '../src/srs/engine'

const NOW = Date.UTC(2026, 8, 27, 12)

beforeEach(async () => {
  await resetAll()
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
    await saveSetting('flipMode', true)
    expect((await loadSettings()).flipMode).toBe(true)
  })

  it('round-trips a backup through export, reset and import', async () => {
    await saveProgress(completeLesson(newProgress('v-gaman'), NOW))
    await recordAnswer({ itemId: 'v-gaman', part: 'meaning', exercise: 'V1', correct: true, at: NOW })
    await saveSetting('lessonBatch', 10)
    const backup = JSON.parse(JSON.stringify(await exportBackup(NOW)))

    await resetAll()
    expect((await loadProgress()).size).toBe(0)

    await importBackup(backup)
    expect((await loadProgress()).get('v-gaman')?.stage).toBe(1)
    expect((await loadSettings()).lessonBatch).toBe(10)
    expect((await exportBackup()).answers).toHaveLength(1)
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
})
