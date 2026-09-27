---
name: verify
description: How to run and drive Kasane in the built-in browser to verify a change.
---

# Verifying Kasane

**Launch:** `preview_start` with name `kasane-dev` (port 5173), then resize to the `mobile` preset and navigate to `http://localhost:5173/kasane/` (the `/kasane/` base path is required).

**Driving it:**
- Read pages with `get_page_text` or `document.body.innerText` rather than screenshots (screenshots lag).
- Split long flows into several `javascript_exec` calls. Calls time out around 45s.
- Wait about 200–300ms after each click. React state doesn't update synchronously, so the next query can miss the new screen.
- Finding the right answer: tap each option in turn. If "Misclick" appears it was wrong, so tap "Misclick — undo" and try the next one.
- The dev-only time machine is in Settings (+4h / +1d / +1w / Reset). Use it to make reviews come due. Press Reset when done.
- Data lives in IndexedDB `kasane` (tables `progress`, `answers`, `settings`). Answers are logged only on Next or Continue.
- The Levels page only lists words for unlocked levels (level 2 is locked on a fresh profile).

**Flows worth driving:**
- Lesson: Lessons, then Next ×4, Start quiz, then Skip warm-up to reach the quiz.
- Review: the Reviews card on Home, once items are due.
- Tapping a word on Levels opens its item page.
- Reload button on Home: set `window.__marker = 1`, tap Reload, and check that the marker is gone.

**Clean up:** Settings → Reset clock, resize to `desktop`, then `preview_stop`.
