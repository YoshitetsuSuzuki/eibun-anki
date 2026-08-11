import { useEffect, useMemo, useState } from 'react'
import type { Card, Status } from '../types'
import { applyOrder, otherSide, syncOrder, type Side } from '../lib/board'
import { shuffle } from '../lib/study'
import { IconFlip, IconShuffle } from './Icons'

type Props = {
  cards: Card[]
  onSetStatus: (cardId: string, status: Status) => void
}

const STATUS_LABEL: Record<Status, string> = { new: 'まだ', weak: '苦手', known: '覚えた' }
const STATUS_COLOR: Record<Status, string> = {
  new: 'var(--steel)',
  weak: 'var(--coral)',
  known: 'var(--mint)',
}
const SIDE_LABEL: Record<Side, string> = { ja: '日本語', en: 'English' }

/**
 * カードを並べて表示する盤面。
 * 個々のカードはタップでめくれ、「全部ひっくり返す」で盤面ごと裏返る。
 * 採点は答えの面にだけ置き、思い出す前に正解を選べてしまうことを防いでいる。
 */
export function CardBoard({ cards, onSetStatus }: Props) {
  const [side, setSide] = useState<Side>('ja')
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set())
  const [order, setOrder] = useState<string[]>(() => cards.map((card) => card.id))

  const idKey = cards.map((card) => card.id).join('|')

  useEffect(() => {
    const ids = idKey ? idKey.split('|') : []
    setOrder((prev) => syncOrder(prev, ids))
  }, [idKey])

  const ordered = useMemo(() => applyOrder(cards, order), [cards, order])
  const answerSide = otherSide(side)

  const flipAll = () => {
    setSide(answerSide)
    setFlipped(new Set())
  }

  const shuffleBoard = () => {
    setOrder((prev) => shuffle(prev))
    setFlipped(new Set())
  }

  const toggle = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <div className="board-bar">
        <button className="btn btn--sm" onClick={flipAll}>
          <IconFlip />
          全部ひっくり返す
        </button>
        <button className="btn btn--sm btn--ghost" onClick={shuffleBoard} disabled={cards.length < 2}>
          <IconShuffle />
          並べ替え
        </button>
        <span className="board-bar__note">表は {SIDE_LABEL[side]}</span>
      </div>

      <div className="board">
        {ordered.map((card) => {
          const showsEnglish = (side === 'en') !== flipped.has(card.id)
          return (
            <div key={card.id} className={showsEnglish ? 'tile is-flipped' : 'tile'}>
              <div className="tile__inner">
                <TileFace
                  card={card}
                  face="ja"
                  isAnswer={answerSide === 'ja'}
                  hidden={showsEnglish}
                  onFlip={() => toggle(card.id)}
                  onSetStatus={onSetStatus}
                />
                <TileFace
                  card={card}
                  face="en"
                  isAnswer={answerSide === 'en'}
                  hidden={!showsEnglish}
                  onFlip={() => toggle(card.id)}
                  onSetStatus={onSetStatus}
                />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function TileFace({
  card,
  face,
  isAnswer,
  hidden,
  onFlip,
  onSetStatus,
}: {
  card: Card
  face: Side
  isAnswer: boolean
  hidden: boolean
  onFlip: () => void
  onSetStatus: (cardId: string, status: Status) => void
}) {
  const text = face === 'ja' ? card.ja : card.en

  return (
    <div className={face === 'en' ? 'tile__face tile__face--back' : 'tile__face'} aria-hidden={hidden}>
      <button
        className={face === 'en' ? 'tile__text en' : 'tile__text'}
        onClick={onFlip}
        tabIndex={hidden ? -1 : 0}
        aria-label={`${text} — めくる`}
      >
        {text}
      </button>
      <div className="tile__foot">
        <span className="tile__mark" style={{ background: STATUS_COLOR[card.status] }} />
        <span className="tile__side">{SIDE_LABEL[face]}</span>
        <span className="tile__spacer" />
        {isAnswer ? (
          <div className="status-pick">
            {(['new', 'weak', 'known'] as Status[]).map((status) => (
              <button
                key={status}
                data-status={status}
                aria-pressed={card.status === status}
                tabIndex={hidden ? -1 : 0}
                onClick={() => onSetStatus(card.id, status)}
              >
                {STATUS_LABEL[status]}
              </button>
            ))}
          </div>
        ) : (
          <span className="tile__hint">タップでめくる</span>
        )}
      </div>
    </div>
  )
}
