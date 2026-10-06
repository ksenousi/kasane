import type { CSSProperties, ReactNode } from 'react'
import { hasKanji, kanjiBreakdown } from '../content'
import type { Item } from '../content/schema'
import ui from '../ui/ui.module.css'
import s from './Lesson.module.css'

/** The parts of a word's page. Lessons show one at a time (WaniKani-style); the Levels page shows them all. */
export type Panel = 'meaning' | 'reading' | 'context'

export function panelsFor(item: Item): Panel[] {
  return hasKanji(item.word) ? ['meaning', 'reading', 'context'] : ['meaning', 'context']
}

export const PANEL_LABEL: Record<Panel, string> = { meaning: 'Meaning', reading: 'Reading', context: 'Context' }

export function WordBand({ item, showReading }: { item: Item; showReading: boolean }) {
  return (
    <div className={s.band}>
      <span className={s.word} lang="ja" style={{ '--len': item.word.length } as CSSProperties}>{item.word}</span>
      {showReading && hasKanji(item.word) && <span className={s.reading} lang="ja">{item.reading}</span>}
      {item.kanji && <span className={s.small} lang="ja">Rarely written {item.kanji}</span>}
    </div>
  )
}

export function PanelView({ item, panel }: { item: Item; panel: Panel }) {
  switch (panel) {
    case 'meaning':
      return (
        <>
          <Section label="Meaning">
            <span className={s.meaning}>{item.meanings.join('; ')}</span>
            <span className={s.small}>{item.pos}</span>
          </Section>
          <KanjiParts word={item.word} />
          <Hook label="Remember the meaning" text={item.mnemonic.meaning} />
        </>
      )
    case 'reading':
      return (
        <>
          <Section label="Reading">
            <span className={s.meaning} lang="ja">{[item.reading, ...(item.readings ?? [])].join('、')}</span>
          </Section>
          {item.mnemonic.reading && <Hook label="Remember the reading" text={item.mnemonic.reading} />}
        </>
      )
    case 'context':
      return (
        <>
          <Section label="Context">
            <div className={s.examples}>
              {item.examples.map((e) => (
                <div key={e.ja} className={`${ui.card} ${s.example}`}>
                  <span className={s.ja} lang="ja">{e.ja}</span>
                  <span className={s.small}>{e.en}</span>
                </div>
              ))}
            </div>
          </Section>
          {item.note && <p className={s.note} lang="ja">{item.note}</p>}
        </>
      )
  }
}

/** Everything about one word on a single page. Used by the Levels page. */
export default function ItemCard({ item }: { item: Item }) {
  return (
    <>
      <WordBand item={item} showReading />
      <div className={s.body}>
        {panelsFor(item).map((p) => <PanelView key={p} item={item} panel={p} />)}
      </div>
    </>
  )
}

function Hook({ label, text }: { label: string; text: string }) {
  return (
    <p className={s.hook} lang="ja">
      <span className={s.hookLabel}>{label}</span>
      {text}
    </p>
  )
}

function KanjiParts({ word }: { word: string }) {
  const parts = kanjiBreakdown(word)
  if (parts.length === 0) return null
  return (
    <Section label="Kanji">
      <div className={s.kanjiList}>
        {parts.map((p) => (
          <div key={p.kanji} className={s.kanjiRow}>
            <span className={s.kanjiChar} lang="ja">{p.kanji}</span>
            <span className={s.kanjiMeaning}>{p.meaning}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.section}>
      <span className={ui.label}>{label}</span>
      {children}
    </div>
  )
}
