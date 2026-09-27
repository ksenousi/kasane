import styles from './App.module.css'

export default function App() {
  return (
    <main className={styles.shell}>
      <img className={styles.icon} src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={88} height={88} />
      <h1 className={styles.title}>
        Kasane <span className={styles.kanji}>重ね</span>
      </h1>
      <p className={styles.sub}>JLPT N3 vocab and grammar. Setting up…</p>
    </main>
  )
}
