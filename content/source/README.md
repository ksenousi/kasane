# Source lists

There has been no official JLPT vocab or grammar list since 2010, so these are community lists. They're used as the checklist for what Kasane teaches. Readings, meanings, example sentences and distractors are written into `src/content/levels/*.json`.

| File | What | Source | License |
|---|---|---|---|
| `n3-vocab.csv` | ~2,140 N3 words: expression, reading, meaning, tags | [jamsinclair/open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) `src/n3.csv`, based on Jonathan Waller's lists at [tanos.co.uk](http://www.tanos.co.uk/jlpt/) | MIT (repo); Tanos lists are CC BY |
| `n3-grammar-points.json` | 182 N3 grammar pattern names (Japanese + romaji only) | Pattern names as listed by [JLPT Sensei](https://jlptsensei.com/jlpt-n3-grammar-list/) | Names only. No explanations or examples copied. |
| `n3-grammar-crosscheck.json` | `core`: the 91 points both JLPT Sensei and [Bunpro](https://bunpro.jp/grammar_points) list as N3, plus each site's extras | Names only | Kasane grammar is written from `core` first |

All lists were downloaded on 2026-09-27. The grammar lists disagree a lot (they share only 91 points), so the overlap is treated as the reliable core.

`wanikani-known.json` (gitignored) is your own WaniKani progress from `scripts/wanikani.mjs`. Kasane skips any vocab you've started there.
