---
name: verify
description: How to run and drive Kasane in the built-in browser to verify a change.
---

# Verifying Kasane

**Launch:** the app needs the Worker for its data. Make sure `.dev.vars` has `PASSPHRASE=dev passphrase`, then `preview_start` `kasane-api` (port 8787) and `kasane-dev` (port 5173, proxies `/api` to 8787). Resize to the `mobile` preset, open `http://localhost:5173/`, and sign in with `dev passphrase`. Or run `npm run build` and use the Worker alone at `http://localhost:8787/`, which serves `dist/` like production does.

**Driving it:**
- Read pages with `get_page_text` or `document.body.innerText` rather than screenshots (screenshots lag).
- Split long flows into several `javascript_exec` calls. Calls time out around 45s.
- Wait about 200–300ms after each click. React state doesn't update synchronously, so the next query can miss the new screen.
- Taps on a question are ignored for its first 400ms (double-tap guard, `src/lib/tapGuard.ts`). Wait at least 500ms after a new question appears before a scripted click.
- Finding the right answer: tap each option in turn. If "Misclick" appears it was wrong, so tap "Misclick — undo" and try the next one.
- The dev-only time machine is in Settings (+4h / +1d / +1w / Reset). Use it to make reviews come due. Press Reset when done.
- Data lives in the Worker's local D1 (`.wrangler/state`), with tables `progress`, `answers`, `settings` and `synonyms`. Read it with `fetch('/api/state')` or `fetch('/api/answers')`. Answers are logged only on Next or Continue.
- The Levels page only lists words for unlocked levels (level 2 is locked on a fresh profile).

**Flows worth driving:**
- Lesson: Lessons, then Next ×4, Start quiz, then Skip warm-up to reach the quiz.
- Review: the Reviews card on Home, once items are due.
- Tapping a word on Levels opens its item page.
- Reload button on Home: set `window.__marker = 1`, tap Reload, and check that the marker is gone.

**iPhone Home Screen mode (iOS Simulator):** Layout bugs that only happen in the installed app can't be reproduced in the desktop browser. Check them in the simulator instead:

1. Boot an iPhone with `xcrun simctl boot <udid>`, then `attach` and `open_url` the live site (https://kasane.ksenousi-5ca.workers.dev/).
2. Install it: Safari's ≡ menu → Share → View More → Add to Home Screen → Add, then tap the Kasane icon.
   - The UI is slow on a fresh simulator, so wait 2–8s between steps.
   - The first launch after install shows a white screen for about 15s and can have a one-off scroll offset. Judge from a cold launch instead: `xcrun simctl terminate booted com.apple.webapp`, then tap the icon again.
3. Read the numbers: long-press the Home logo (`tap` with `duration: 1.2`) to open the diagnostics panel. It shows standalone mode, innerHeight, clientHeight, scroll position, safe-area insets, and where the header and tab bar sit.
   - Known quirk: `clientHeight` is 62pt short of `innerHeight` (812 vs 874). `tokens.css` corrects for it.
4. To pick up a new deploy, tap Reload twice.

**Clean up:** Settings → Reset clock, resize to `desktop`, then `preview_stop`.
