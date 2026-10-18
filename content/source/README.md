# Source lists

There has been no official JLPT vocab list since 2010, so these are community lists. They're used as the checklist for what Kasane teaches. Readings, meanings, example sentences and distractors are written into `src/content/levels/*.json`.

| File | What | Source | License |
|---|---|---|---|
| `n3-vocab.csv` | ~2,140 N3 words: expression, reading, meaning, tags | [jamsinclair/open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) `src/n3.csv`, based on Jonathan Waller's lists at [tanos.co.uk](http://www.tanos.co.uk/jlpt/) | MIT (repo); Tanos lists are CC BY |
| `n5-vocab.csv`, `n4-vocab.csv` | Easier JLPT word lists from the same repo | Same | Used only to leave out kana words you'd already know |

All lists were downloaded on 2026-09-27.

`wanikani-known.json` and `wanikani-upto40.json` (both gitignored) come from `scripts/wanikani.mjs`: your WaniKani progress, and every vocab item WaniKani teaches up to level 40. Kasane skips both, since you plan to reach WaniKani 40.

Word frequency comes from two lists: [JPDB](https://jpdb.io) (anime, dramas, novels, games) and NINJAL's [BCCWJ](https://clrd.ninjal.ac.jp/bccwj/en/freq-list.html) (books, newspapers, magazines, the web). Levels 1-21 are N3 words in JPDB's top 20,000. Levels 22-24 add N3 words in BCCWJ's top 20,000 that fiction rarely uses (金融, 駐車, 申告). Only each chosen word's rank is stored, in `content/plan.json` (`rank` for JPDB, `bccwj` for BCCWJ).

