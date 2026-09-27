import { useRef, type MouseEvent } from 'react'

/** Longer than a double-tap, shorter than anyone can read a question and answer it. */
const GUARD_MS = 400

/**
 * Swallow taps that land in the first moment after a question appears, so a
 * double-tap on Next can't also pick whatever option slid under the finger.
 * Put the returned handler on the question's root as onClickCapture; the
 * component must remount per question (Session keys it by answer count).
 */
export function useTapGuard() {
  const shownAt = useRef(performance.now())
  return (e: MouseEvent) => {
    if (performance.now() - shownAt.current < GUARD_MS) {
      e.stopPropagation()
      e.preventDefault()
    }
  }
}
