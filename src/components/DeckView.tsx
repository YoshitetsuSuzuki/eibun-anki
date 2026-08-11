import { useMemo, useState } from 'react'
import type { AppState, Card, Deck, SessionSpec, Status } from '../types'
import { cardsOfDeck, statsOf } from '../lib/study'
import { SegBar } from './SegBar'
import { IconBack, IconPencil, IconTrash } from './Icons'

type Filter = 'all' | Status

type Props = {
  state: AppState
  deck: Deck
  onBack: () => void
  onStudy: (spec: SessionSpec, title: string) => void
  onAddCards: (deckId: string) => void
  onRename: (deckId: string, name: string) => void
  onDeleteDeck: (deckId: string) => void
  onResetProgress: (deckId: string) => void
  onSetStatus: (cardId: string, status: Status) => void
  onEditCard: (cardId: string, en: string, ja: string) => void
  onDeleteCard: (cardId: string) => void
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'weak', label: '苦手' },
  { key: 'new', label: '未学習' },
  { key: 'known', label: '覚えた' },
]

const STATUS_LABEL: Record<Status, string> = { new: 'まだ', weak: '苦手', known: '覚えた' }

export function DeckView({
  state,
  deck,
  onBack,
  onStudy,
  onAddCards,
  onRename,
  onDeleteDeck,
  onResetProgress,
  onSetStatus,
  onEditCard,
  onDeleteCard,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(deck.name)
  const [editingId, setEditingId] = useState<string | null>(null)

  const cards = useMemo(() => cardsOfDeck(state, deck.id), [state, deck.id])
  const stats = useMemo(() => statsOf(cards), [cards])
  const visible = useMemo(
    () => (filter === 'all' ? cards : cards.filter((card) => card.status === filter)),
    [cards, filter],
  )

  const commitRename = () => {
    setRenaming(false)
    if (draftName.trim() && draftName !== deck.name) onRename(deck.id, draftName)
    else setDraftName(deck.name)
  }

  return (
    <div className="shell">
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="ホームへ戻る">
          <IconBack />
        </button>
        <div className="brand">
          {renaming ? (
            <input
              className="input"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitRename()
                if (event.key === 'Escape') {
                  setDraftName(deck.name)
                  setRenaming(false)
                }
              }}
              aria-label="デッキ名"
              autoFocus
            />
          ) : (
            <span className="brand__mark">{deck.name}</span>
          )}
        </div>
        {!renaming && (
          <button className="icon-btn" onClick={() => setRenaming(true)} aria-label="デッキ名を変える">
            <IconPencil size={17} />
          </button>
        )}
      </div>

      <section className="section">
        <div className="panel overview">
          <div className="overview__total">
            <span className="num">{stats.total}</span>
            <span className="overview__unit">枚</span>
          </div>
          <SegBar stats={stats} />
          <div className="legend">
            <span className="legend__item">
              <span className="legend__dot" style={{ background: 'var(--sage)' }} />
              覚えた <span className="legend__num">{stats.known}</span>
            </span>
            <span className="legend__item">
              <span className="legend__dot" style={{ background: 'var(--amber)' }} />
              苦手 <span className="legend__num">{stats.weak}</span>
            </span>
            <span className="legend__item">
              <span className="legend__dot" style={{ background: 'var(--slate)' }} />
              未学習 <span className="legend__num">{stats.new}</span>
            </span>
          </div>
        </div>

        <div className="actions">
          <button
            className="action-tile action-tile--accent"
            disabled={stats.total === 0}
            onClick={() =>
              onStudy({ deckId: deck.id, statuses: [], direction: 'ja-en' }, deck.name)
            }
          >
            <span className="action-tile__title">学習する</span>
            <span className="action-tile__note">{stats.total} 枚をランダムに</span>
          </button>
          <button
            className="action-tile"
            disabled={stats.weak === 0}
            onClick={() =>
              onStudy({ deckId: deck.id, statuses: ['weak'], direction: 'ja-en' }, `${deck.name}／苦手`)
            }
          >
            <span className="action-tile__title">苦手だけ</span>
            <span className="action-tile__note">{stats.weak} 枚</span>
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">カード</h2>
          <span className="section__rule" />
          <button className="btn btn--sm btn--ghost" onClick={() => onAddCards(deck.id)}>
            追加
          </button>
        </div>

        <div className="chips">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              className="chip"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
              {item.key !== 'all' && ` ${stats[item.key]}`}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="empty">
            <p className="empty__title">該当するカードはありません</p>
            <p className="empty__body">別の絞り込みをお試しください。</p>
          </div>
        ) : (
          <div className="deck-list">
            {visible.map((card) =>
              editingId === card.id ? (
                <CardEditor
                  key={card.id}
                  card={card}
                  onCancel={() => setEditingId(null)}
                  onSave={(en, ja) => {
                    onEditCard(card.id, en, ja)
                    setEditingId(null)
                  }}
                />
              ) : (
                <article key={card.id} className="entry">
                  <p className="entry__en en">{card.en}</p>
                  <p className="entry__ja">{card.ja}</p>
                  <div className="entry__foot">
                    <div className="status-pick">
                      {(['new', 'weak', 'known'] as Status[]).map((status) => (
                        <button
                          key={status}
                          data-status={status}
                          aria-pressed={card.status === status}
                          onClick={() => onSetStatus(card.id, status)}
                        >
                          {STATUS_LABEL[status]}
                        </button>
                      ))}
                    </div>
                    <span className="entry__spacer" />
                    <button
                      className="row__drop"
                      onClick={() => setEditingId(card.id)}
                      aria-label="このカードを編集"
                    >
                      <IconPencil />
                    </button>
                    <button
                      className="row__drop"
                      onClick={() => {
                        if (window.confirm('このカードを削除しますか。')) onDeleteCard(card.id)
                      }}
                      aria-label="このカードを削除"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">このデッキの管理</h2>
          <span className="section__rule" />
        </div>
        <div className="deck__foot">
          <button
            className="btn btn--sm btn--ghost"
            onClick={() => {
              if (window.confirm('このデッキの学習状況をすべて未学習に戻しますか。')) {
                onResetProgress(deck.id)
              }
            }}
          >
            進捗をリセット
          </button>
          <span className="deck__spacer" />
          <button
            className="btn btn--sm btn--danger"
            onClick={() => {
              if (window.confirm(`「${deck.name}」を ${stats.total} 枚ごと削除しますか。`)) {
                onDeleteDeck(deck.id)
              }
            }}
          >
            デッキを削除
          </button>
        </div>
      </section>
    </div>
  )
}

function CardEditor({
  card,
  onSave,
  onCancel,
}: {
  card: Card
  onSave: (en: string, ja: string) => void
  onCancel: () => void
}) {
  const [en, setEn] = useState(card.en)
  const [ja, setJa] = useState(card.ja)

  return (
    <div className="entry">
      <input
        className="row__en"
        value={en}
        onChange={(event) => setEn(event.target.value)}
        aria-label="英文"
        spellCheck={false}
        autoFocus
      />
      <input
        className="row__ja"
        value={ja}
        onChange={(event) => setJa(event.target.value)}
        aria-label="日本語訳"
      />
      <div className="entry__foot">
        <button
          className="btn btn--sm btn--primary"
          onClick={() => onSave(en, ja)}
          disabled={!en.trim() || !ja.trim()}
        >
          保存
        </button>
        <button className="btn btn--sm btn--ghost" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  )
}
