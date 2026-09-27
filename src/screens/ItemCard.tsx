import type { ReactNode } from 'react'
import { hasKanji, itemLabel, kanjiBreakdown } from '../content'
import type { Item } from '../content/schema'
import ui from '../ui/ui.module.css'
import s from './Lesson.module.css'

/** The study card for one item: word or pattern, meaning, examples, notes. Used by lessons and the Levels page. */
export default function ItemCard({ item }: { item: Item }) {
  return (
    <>
      <div className={s.band}>
        <span className={item.kind === 'vocab' ? s.word : s.pattern} lang="ja">{itemLabel(item)}</span>
        {item.kind === 'vocab' && hasKanji(item.word) && <span className={s.reading} lang="ja">{item.reading}</span>}
        {item.kind === 'vocab' && item.kanji && <span className={s.small} lang="ja">Rarely written {item.kanji}</span>}
      </div>

      <div className={s.body}>
        {item.kind === 'vocab' ? (
          <>
            <Section label="Meaning"><span className={s.meaning}>{item.meanings.join('; ')}</span><span className={s.small}>{item.pos}</span></Section>
            <KanjiParts word={item.word} />
          </>
        ) : (
          <>
            <Section label="Meaning"><span className={s.meaning}>{item.meaning}</span></Section>
            <Section label="How it connects"><span className={s.connect} lang="ja">{item.connection}</span></Section>
          </>
        )}
        {item.examples.map((e) => (
          <div key={e.full} className={`${ui.card} ${s.example}`}>
            <span className={s.ja} lang="ja">{e.full}</span>
            <span className={s.small}>{e.en}</span>
          </div>
        ))}
        {item.note && <p className={s.note} lang="ja">{item.note}</p>}
      </div>
    </>
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
