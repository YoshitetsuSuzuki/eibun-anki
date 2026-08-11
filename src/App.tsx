import { useEffect, useState } from 'react'
import type { AppState, Card, SessionSpec, Status } from './types'
import {
  addDeck,
  appendToDeck,
  deleteCard,
  deleteDeck,
  renameDeck,
  resetProgress,
  setCardStatus,
  updateCardText,
  updateSettings,
} from './lib/actions'
import { downloadState, pickJsonFile } from './lib/backup'
import type { ParsedRow } from './lib/parser'
import { loadState, mergeState, sanitizeState, saveState } from './lib/storage'
import { buildSession } from './lib/study'
import { primeVoices } from './lib/speech'
import { DeckView } from './components/DeckView'
import { Home } from './components/Home'
import { ImportView } from './components/ImportView'
import { StudyView } from './components/StudyView'

type View =
  | { name: 'home' }
  | { name: 'import'; deckId: string | null }
  | { name: 'deck'; deckId: string }
  | { name: 'study'; spec: SessionSpec; title: string; cards: Card[]; seed: number }

type ImportTarget = { kind: 'new'; name: string } | { kind: 'existing'; deckId: string }

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState(window.localStorage))
  const [view, setView] = useState<View>({ name: 'home' })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    saveState(window.localStorage, state)
  }, [state])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
  }, [state.settings.theme])

  useEffect(() => {
    primeVoices()
  }, [])

  // 画面を移ったら先頭から読ませる。前の画面の位置が残ると迷子になる。
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view.name, view.name === 'deck' ? view.deckId : null])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(id)
  }, [toast])

  const goHome = () => setView({ name: 'home' })

  /** 出題順はここで一度だけ決める。学習中の採点で並びが変わらないようカードを持ち回る。 */
  const startStudy = (spec: SessionSpec, title: string) => {
    setView({ name: 'study', spec, title, cards: buildSession(state, spec), seed: Date.now() })
  }

  const handleImport = (target: ImportTarget, rows: ParsedRow[]) => {
    setState((prev) =>
      target.kind === 'new'
        ? addDeck(prev, target.name, rows, Date.now())
        : appendToDeck(prev, target.deckId, rows),
    )
    setToast(`${rows.length} 件を取り込みました`)
    goHome()
  }

  const handleRestore = async () => {
    const raw = await pickJsonFile()
    if (raw === null) return
    const incoming = sanitizeState(raw)
    if (!incoming) {
      setToast('このファイルは読み込めませんでした')
      return
    }
    const mode = window.confirm(
      '「OK」で今のデータに追加します。\n「キャンセル」で今のデータを置き換えます。',
    )
      ? 'append'
      : 'replace'
    setState((prev) => mergeState(prev, incoming, mode))
    setToast(mode === 'append' ? 'データを追加しました' : 'データを置き換えました')
  }

  const home = (
    <Home
      state={state}
      onImport={() => setView({ name: 'import', deckId: null })}
      onStudy={startStudy}
      onOpenDeck={(deckId) => setView({ name: 'deck', deckId })}
      onToggleTheme={() =>
        setState((prev) =>
          updateSettings(prev, { theme: prev.settings.theme === 'dark' ? 'light' : 'dark' }),
        )
      }
      onToggleSpeak={() =>
        setState((prev) => updateSettings(prev, { speakOnReveal: !prev.settings.speakOnReveal }))
      }
      onExport={() => {
        downloadState(state)
        setToast('バックアップを書き出しました')
      }}
      onRestore={handleRestore}
    />
  )

  const deck = view.name === 'deck' ? state.decks.find((item) => item.id === view.deckId) : undefined

  let body = home

  if (view.name === 'study') {
    body = (
      <StudyView
        key={view.seed}
        cards={view.cards}
        title={view.title}
        direction={view.spec.direction}
        speakOnReveal={state.settings.speakOnReveal}
        onGrade={(cardId: string, status: Status) =>
          setState((prev) => setCardStatus(prev, cardId, status, Date.now()))
        }
        onExit={goHome}
        onRestart={(mode) => {
          const spec: SessionSpec =
            mode === 'weak' ? { ...view.spec, statuses: ['weak'] } : view.spec
          startStudy(spec, mode === 'weak' ? `${view.title}／苦手` : view.title)
        }}
      />
    )
  } else if (view.name === 'import') {
    body = (
      <ImportView
        state={state}
        initialDeckId={view.deckId}
        onCancel={goHome}
        onImport={handleImport}
      />
    )
  } else if (view.name === 'deck' && deck) {
    body = (
      <DeckView
        state={state}
        deck={deck}
        onBack={goHome}
        onStudy={startStudy}
        onAddCards={(deckId) => setView({ name: 'import', deckId })}
        onRename={(deckId, name) => setState((prev) => renameDeck(prev, deckId, name))}
        onDeleteDeck={(deckId) => {
          setState((prev) => deleteDeck(prev, deckId))
          goHome()
        }}
        onResetProgress={(deckId) => setState((prev) => resetProgress(prev, deckId))}
        onSetStatus={(cardId, status) =>
          setState((prev) => setCardStatus(prev, cardId, status, Date.now()))
        }
        onEditCard={(cardId, en, ja) => setState((prev) => updateCardText(prev, cardId, en, ja))}
        onDeleteCard={(cardId) => setState((prev) => deleteCard(prev, cardId))}
      />
    )
  }

  return (
    <>
      {body}
      {toast && <p className="toast">{toast}</p>}
    </>
  )
}
