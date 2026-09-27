import { describe, expect, it } from 'vitest'
import { applyReview, completeLesson, holdReview, isDue, newProgress, nextStage } from '../src/srs/engine'

const HOUR = 3_600_000
const NOW = Date.UTC(2026, 8, 27, 12)

describe('nextStage', () => {
  it('moves up one stage on a clean review', () => {
    expect(nextStage(1, 0)).toBe(2)
    expect(nextStage(4, 0)).toBe(5)
    expect(nextStage(8, 0)).toBe(9)
  })

  it('drops one stage per two misses below Guru', () => {
    expect(nextStage(3, 1)).toBe(2)
    expect(nextStage(3, 2)).toBe(2)
    expect(nextStage(4, 3)).toBe(2)
  })

  it('drops twice as fast from Guru up', () => {
    expect(nextStage(5, 1)).toBe(3)
    expect(nextStage(7, 1)).toBe(5)
    expect(nextStage(8, 3)).toBe(4)
  })

  it('never drops below Apprentice 1', () => {
    expect(nextStage(1, 1)).toBe(1)
    expect(nextStage(2, 6)).toBe(1)
    expect(nextStage(6, 9)).toBe(1)
  })
})

describe('review lifecycle', () => {
  it('starts at Apprentice 1, due in 4 hours', () => {
    const p = completeLesson(newProgress('v1'), NOW)
    expect(p.stage).toBe(1)
    expect(p.dueAt).toBe(NOW + 4 * HOUR)
    expect(isDue(p, NOW)).toBe(false)
    expect(isDue(p, NOW + 4 * HOUR)).toBe(true)
  })

  it('records passedAt the first time Guru is reached and keeps it after a drop', () => {
    let p = { ...completeLesson(newProgress('v1'), NOW), stage: 4 as const }
    p = applyReview(p, 0, NOW)
    expect(p.stage).toBe(5)
    expect(p.passedAt).toBe(NOW)
    p = applyReview(p, 1, NOW + 1)
    expect(p.stage).toBe(3)
    expect(p.passedAt).toBe(NOW)
  })

  it('burns at stage 9 with no further reviews', () => {
    const p = applyReview({ ...newProgress('v1'), stage: 8 }, 0, NOW)
    expect(p.stage).toBe(9)
    expect(p.dueAt).toBeNull()
    expect(p.burnedAt).toBe(NOW)
    expect(isDue(p, NOW + 1e12)).toBe(false)
  })

  it('counts correct and incorrect reviews', () => {
    let p = completeLesson(newProgress('v1'), NOW)
    p = applyReview(p, 0, NOW)
    p = applyReview(p, 2, NOW)
    expect(p.correct).toBe(1)
    expect(p.incorrect).toBe(1)
  })

  it('holds the stage for a half pass and restarts the timer', () => {
    const p = holdReview({ ...newProgress('v1'), stage: 7, dueAt: NOW }, NOW)
    expect(p.stage).toBe(7)
    expect(p.dueAt).toBe(NOW + 30 * 24 * HOUR)
  })
})
