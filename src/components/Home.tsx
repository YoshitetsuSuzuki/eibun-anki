import { useMemo } from 'react'
import type { AppState, SessionSpec } from '../types'
import { cardsOfDeck, statsOf } from '../lib/study'
import { speechAvailable } from '../lib/speech'
import { SegBar } from './SegBar'
import { IconDownload, IconMoon, IconSun, IconUpload } from './Icons'

type Props = {
  state: AppState
  onImport: () => void
  onStudy: (spec: SessionSpec, title: string) => void
  onOpenDeck: (deckId: string) => void
  onToggleTheme: () => void
  onToggleSpeak: () => void
  onExport: () => void
  onRestore: () => void
}

export function Home({
  state,
  onImport,
  onStudy,
  onOpenDeck,
  onToggleTheme,
  onToggleSpeak,
  onExport,
  onRestore,
}: Props) {
  const stats = useMemo(() => statsOf(state.cards), [state.cards])
  const dark = state.settings.theme === 'dark'

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand__mark">英文暗記</span>
          <span className="brand__sub">recite</span>
        </div>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={dark ? '明るいテーマにする' : '暗いテーマにする'}
        >
          {dark ? <IconSun /> : <IconMoon />}
        </button>
      </div>

      {stats.total > 0 && (
        <section className="section rise">
          <div className="panel overview">
            <p className="eyebrow">全体</p>
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
        </section>
      )}

      <div className="actions">
        <button
          className="action-tile action-tile--accent"
          disabled={stats.weak === 0}
          onClick={() =>
            onStudy({ deckId: null, statuses: ['weak'], direction: 'ja-en' }, '苦手ゾーン')
          }
        >
          <span className="action-tile__title">苦手テスト</span>
          <span className="action-tile__note">
            {stats.weak > 0 ? `苦手 ${stats.weak} 枚をランダムに` : '苦手カードはまだありません'}
          </span>
        </button>
        <button className="action-tile" onClick={onImport}>
          <span className="action-tile__title">英文を取り込む</span>
          <span className="action-tile__note">貼り付けてカード化</span>
        </button>
      </div>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">デッキ</h2>
          <span className="section__rule" />
          {state.decks.length > 0 && (
            <button
              className="btn btn--sm btn--ghost"
              disabled={stats.total === 0}
              onClick={() => onStudy({ deckId: null, statuses: [], direction: 'ja-en' }, 'すべて')}
            >
              全部まとめて
            </button>
          )}
        </div>

        {state.decks.length === 0 ? (
          <div className="empty">
            <p className="empty__title">まだデッキがありません</p>
            <p className="empty__body">
              作った英文とその訳を貼り付けると、そのままカードになります。
            </p>
            <p style={{ marginTop: '1.1rem' }}>
              <button className="btn btn--primary" onClick={onImport}>
                英文を取り込む
              </button>
            </p>
          </div>
        ) : (
          <div className="deck-list">
            {state.decks.map((deck) => {
              const deckStats = statsOf(cardsOfDeck(state, deck.id))
              return (
                <article key={deck.id} className="deck">
                  <div className="deck__head">
                    <button className="deck__name" onClick={() => onOpenDeck(deck.id)}>
                      {deck.name}
                    </button>
                    <span className="deck__count">{deckStats.total} 枚</span>
                  </div>
                  <SegBar stats={deckStats} thin />
                  <div className="deck__foot">
                    <button
                      className="btn btn--sm"
                      disabled={deckStats.total === 0}
                      onClick={() =>
                        onStudy({ deckId: deck.id, statuses: [], direction: 'ja-en' }, deck.name)
                      }
                    >
                      学習する
                    </button>
                    <button
                      className="btn btn--sm btn--amber"
                      disabled={deckStats.weak === 0}
                      onClick={() =>
                        onStudy(
                          { deckId: deck.id, statuses: ['weak'], direction: 'ja-en' },
                          `${deck.name}／苦手`,
                        )
                      }
                    >
                      苦手 {deckStats.weak}
                    </button>
                    <span className="deck__spacer" />
                    <button className="btn btn--sm btn--ghost" onClick={() => onOpenDeck(deck.id)}>
                      カード一覧
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">設定</h2>
          <span className="section__rule" />
        </div>
        <div className="panel">
          {speechAvailable() && (
            <div className="setting">
              <div className="setting__text">
                <p className="setting__title">めくったら英文を読み上げる</p>
                <p className="setting__note">端末内蔵の音声を使います。通信も料金も発生しません。</p>
              </div>
              <button
                className="switch"
                role="switch"
                aria-checked={state.settings.speakOnReveal}
                aria-label="めくったら英文を読み上げる"
                onClick={onToggleSpeak}
              />
            </div>
          )}
          <div className="setting">
            <div className="setting__text">
              <p className="setting__title">バックアップ</p>
              <p className="setting__note">
                データは端末内にのみ保存されます。書き出しておけば機種変更でも失いません。
              </p>
            </div>
            <button className="btn btn--sm btn--ghost" onClick={onExport} disabled={stats.total === 0}>
              <IconDownload />
              書き出す
            </button>
            <button className="btn btn--sm btn--ghost" onClick={onRestore}>
              <IconUpload />
              読み込む
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
