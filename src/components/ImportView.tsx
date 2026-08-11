import { useEffect, useMemo, useState } from 'react'
import type { AppState } from '../types'
import { annotateRows, enKey, parseCards, type ParsedRow } from '../lib/parser'
import { IconBack, IconTrash } from './Icons'

type Props = {
  state: AppState
  initialDeckId: string | null
  onCancel: () => void
  onImport: (target: { kind: 'new'; name: string } | { kind: 'existing'; deckId: string }, rows: ParsedRow[]) => void
}

const SAMPLE = `I have been thinking about it all week.
そのことを一週間ずっと考えていました。

Let me get back to you tomorrow.
明日、折り返しご連絡します。`

export function ImportView({ state, initialDeckId, onCancel, onImport }: Props) {
  const [text, setText] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [target, setTarget] = useState<string>(initialDeckId ?? 'new')
  const [name, setName] = useState('')
  const [includeDuplicates, setIncludeDuplicates] = useState(false)

  useEffect(() => {
    setRows(parseCards(text))
  }, [text])

  const existingKeys = useMemo(() => {
    if (target === 'new') return new Set<string>()
    return new Set(state.cards.filter((c) => c.deckId === target).map((c) => enKey(c.en)))
  }, [state.cards, target])

  const annotated = useMemo(() => annotateRows(rows, existingKeys), [rows, existingKeys])

  const counts = useMemo(() => {
    let ready = 0
    let incomplete = 0
    let duplicate = 0
    for (const item of annotated) {
      if (item.issue === 'incomplete') incomplete += 1
      else if (item.issue === 'duplicate') duplicate += 1
      else ready += 1
    }
    return { ready, incomplete, duplicate }
  }, [annotated])

  const importable = useMemo(
    () =>
      annotated
        .filter((item) => item.issue === null || (item.issue === 'duplicate' && includeDuplicates))
        .map((item) => item.row),
    [annotated, includeDuplicates],
  )

  const editRow = (id: string, patch: Partial<ParsedRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const dropRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  const submit = () => {
    if (importable.length === 0) return
    onImport(
      target === 'new' ? { kind: 'new', name } : { kind: 'existing', deckId: target },
      importable,
    )
  }

  return (
    <div className="shell">
      <div className="topbar">
        <button className="icon-btn" onClick={onCancel} aria-label="戻る">
          <IconBack />
        </button>
        <div className="brand">
          <span className="brand__mark">英文を取り込む</span>
        </div>
      </div>

      <section className="section">
        <label className="field">
          <span className="field__label">貼り付け</span>
          <textarea
            className="textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={SAMPLE}
            spellCheck={false}
            autoFocus
          />
        </label>
        <p className="hint">
          英文と日本語訳が交互に並んだ箇条書き、<code>英文 | 訳</code> のような 1 行 1 組、
          タブ区切り — どの形でも読み取ります。英語と日本語の順番も問いません。
          行頭の <code>-</code> や <code>1.</code> は自動で外します。
        </p>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">保存先</h2>
          <span className="section__rule" />
        </div>
        <label className="field">
          <span className="field__label">デッキ</span>
          <select
            className="input"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          >
            <option value="new">新しいデッキを作る</option>
            {state.decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name} に追加
              </option>
            ))}
          </select>
        </label>
        {target === 'new' && (
          <label className="field">
            <span className="field__label">デッキ名</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`デッキ ${state.decks.length + 1}`}
            />
          </label>
        )}
      </section>

      {rows.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">プレビュー</h2>
            <span className="section__rule" />
          </div>

          <div className="summary">
            <span>
              取り込めるカード <strong className="num">{counts.ready}</strong> 件
            </span>
            {counts.incomplete > 0 && <span className="tag tag--warn">要修正 {counts.incomplete}</span>}
            {counts.duplicate > 0 && (
              <button
                className="tag tag--warn"
                onClick={() => setIncludeDuplicates((v) => !v)}
                aria-pressed={includeDuplicates}
              >
                重複 {counts.duplicate}／{includeDuplicates ? '取り込む' : '除外中'}
              </button>
            )}
          </div>

          <div className="preview">
            {annotated.map((item, i) => (
              <div key={item.row.id} className={item.issue ? 'row row--issue' : 'row'}>
                <span className="row__index">{i + 1}</span>
                <div className="row__body">
                  <input
                    className="row__en"
                    value={item.row.en}
                    onChange={(event) => editRow(item.row.id, { en: event.target.value })}
                    placeholder="英文を入力してください"
                    aria-label={`${i + 1} 行目の英文`}
                    spellCheck={false}
                  />
                  <input
                    className="row__ja"
                    value={item.row.ja}
                    onChange={(event) => editRow(item.row.id, { ja: event.target.value })}
                    placeholder="日本語訳を入力してください"
                    aria-label={`${i + 1} 行目の日本語訳`}
                  />
                </div>
                <button
                  className="row__drop"
                  onClick={() => dropRow(item.row.id)}
                  aria-label={`${i + 1} 行目を削除`}
                >
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>

          <div className="sticky-foot">
            <button className="btn btn--primary" onClick={submit} disabled={importable.length === 0}>
              {importable.length} 件を取り込む
            </button>
            <button className="btn btn--ghost" onClick={onCancel}>
              やめる
            </button>
          </div>
        </section>
      )}

      {rows.length === 0 && text.trim().length === 0 && (
        <section className="section">
          <div className="empty">
            <p className="empty__title">まずは英文を貼り付けてください</p>
            <p className="empty__body">貼り付けた瞬間に、ここへカードの下書きが並びます。</p>
            <pre className="sample">{SAMPLE}</pre>
          </div>
        </section>
      )}
    </div>
  )
}
