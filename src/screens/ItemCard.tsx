import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { hasKanji, kanjiBreakdown } from '../content'
import type { Item } from '../content/schema'
import { useStore } from '../state/store'
import ui from '../ui/ui.module.css'
import s from './Lesson.module.css'

export function WordBand({ item }: { item: Item }) {
  return (
    <div className={s.band}>
      <span className={s.word} lang="ja" style={{ '--len': item.word.length } as CSSProperties}>{item.word}</span>
      {hasKanji(item.word) && <span className={s.reading} lang="ja">{[item.reading, ...(item.readings ?? [])].join('、')}</span>}
      {item.kanji && <span className={s.small} lang="ja">Rarely written {item.kanji}</span>}
    </div>
  )
}

/** Everything about one word on a single, scannable page: meaning, kanji, hooks, example. Used by lessons and the Levels page. */
export function WordSheet({ item }: { item: Item }) {
  const parts = kanjiBreakdown(item.word)
  return (
    <div className={s.body}>
      <div className={s.section}>
        <span className={s.meaning}>{item.meanings.join('; ')}</span>
        <span className={s.small}>{item.pos}</span>
      </div>

      {parts.length > 0 && (
        <div className={s.parts}>
          {parts.map((p) => (
            <span key={p.kanji} className={s.part}>
              <span className={s.partChar} lang="ja">{p.kanji}</span>
              {p.meaning}
            </span>
          ))}
        </div>
      )}

      <div className={s.hooks}>
        <Hook tag="M" label="Meaning" text={item.mnemonic.meaning} />
        {item.mnemonic.reading && <Hook tag="R" label="Reading" text={item.mnemonic.reading} />}
      </div>

      {item.examples.map((e) => (
        <div key={e.ja} className={s.example}>
          <span className={s.ja} lang="ja">{e.ja}</span>
          <span className={s.small}>{e.en}</span>
        </div>
      ))}

      {item.note && <p className={s.note} lang="ja">{item.note}</p>}
      <Synonyms item={item} />
    </div>
  )
}

export default function ItemCard({ item }: { item: Item }) {
  return (
    <>
      <WordBand item={item} />
      <WordSheet item={item} />
    </>
  )
}

/** The user's own extra meanings for this word. Reviews accept them like the built-in ones. */
function Synonyms({ item }: { item: Item }) {
  const { synonyms, addSynonym, removeSynonym } = useStore()
  const list = synonyms.get(item.id) ?? []
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (text.trim()) void addSynonym(item.id, text)
    setText('')
    setAdding(false)
  }

  return (
    <Section label="Your synonyms">
      <div className={s.synList}>
        {list.map((m) => (
          <span key={m} className={s.syn}>
            {m}
            <button className={s.synRemove} onClick={() => void removeSynonym(item.id, m)} aria-label={`Remove ${m}`}>×</button>
          </span>
        ))}
        {adding ? (
          <form className={s.synForm} onSubmit={submit}>
            <input
              className={s.synInput}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
              placeholder="e.g. to endure"
              aria-label="New synonym"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
            />
            <button type="submit" className={s.synAdd}>Add</button>
          </form>
        ) : (
          <button className={s.synNew} onClick={() => setAdding(true)}>+ Add synonym</button>
        )}
      </div>
    </Section>
  )
}

function Hook({ tag, label, text }: { tag: string; label: string; text: string }) {
  return (
    <p className={s.hook} lang="ja">
      <span className={s.hookTag} aria-label={label}>{tag}</span>
      <span>{text}</span>
    </p>
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
