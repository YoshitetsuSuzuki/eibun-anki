import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card, Direction, Status } from '../types'
import { speak, speechAvailable, stopSpeaking } from '../lib/speech'
import { IconClose, IconSound, IconSwap } from './Icons'

type Props = {
  cards: Card[]
  title: string
  direction: Direction
  speakOnReveal: boolean
  onGrade: (cardId: string, status: Status) => void
  onExit: () => void
  onRestart: (mode: 'same' | 'weak') => void
}

type Tally = Record<Status, number>

const GRADES: { status: Status; label: string; key: string; modifier: string }[] = [
  { status: 'new', label: 'まだ', key: '1', modifier: 'grade--new' },
  { status: 'weak', label: '苦手', key: '2', modifier: 'grade--weak' },
  { status: 'known', label: '覚えた', key: '3', modifier: 'grade--known' },
]

/** めくり戻しのアニメーションが見えている間に次の英文が覗かないよう、少しだけ待って進める。 */
const ADVANCE_DELAY = 220

export function StudyView({
  cards,
  title,
  direction: initialDirection,
  speakOnReveal,
  onGrade,
  onExit,
  onRestart,
}: Props) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [locked, setLocked] = useState(false)
  const [direction, setDirection] = useState<Direction>(initialDirection)
  const [tally, setTally] = useState<Tally>({ new: 0, weak: 0, known: 0 })
  const timer = useRef<number | null>(null)

  const card = cards[index]
  const finished = index >= cards.length
  const canSpeak = speechAvailable()

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    if (revealed && speakOnReveal && card) speak(card.en)
  }, [revealed, speakOnReveal, card])

  const reveal = useCallback(() => {
    if (!locked) setRevealed(true)
  }, [locked])

  const grade = useCallback(
    (status: Status) => {
      if (!card || locked) return
      onGrade(card.id, status)
      setTally((prev) => ({ ...prev, [status]: prev[status] + 1 }))
      setLocked(true)
      setRevealed(false)
      stopSpeaking()
      timer.current = window.setTimeout(() => {
        setIndex((i) => i + 1)
        setLocked(false)
      }, ADVANCE_DELAY)
    },
    [card, locked, onGrade],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return

      if (event.key === 'Escape') {
        onExit()
        return
      }
      if (finished) return

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        if (revealed) grade('known')
        else reveal()
        return
      }
      if (!revealed) return

      const match = GRADES.find((g) => g.key === event.key)
      if (match) {
        event.preventDefault()
        grade(match.status)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finished, revealed, grade, reveal, onExit])

  if (cards.length === 0) {
    return (
      <div className="study">
        <div className="study__bar">
          <span className="study__title">{title}</span>
          <button className="icon-btn" onClick={onExit} aria-label="閉じる">
            <IconClose />
          </button>
        </div>
        <div className="stage">
          <div className="empty">
            <p className="empty__title">対象のカードがありません</p>
            <p className="empty__body">条件を変えるか、英文を取り込んでからお試しください。</p>
          </div>
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="study">
        <div className="study__bar">
          <span className="study__title">{title}</span>
          <button className="icon-btn" onClick={onExit} aria-label="閉じる">
            <IconClose />
          </button>
        </div>
        <div className="stage">
          <div className="panel result rise">
            <div>
              <p className="eyebrow">session complete</p>
              <h2 className="result__title">{cards.length} 枚、通しました</h2>
            </div>
            <div className="result__grid">
              <div className="result__cell">
                <span className="result__num" style={{ color: 'var(--sage)' }}>
                  {tally.known}
                </span>
                <span className="result__cap">覚えた</span>
              </div>
              <div className="result__cell">
                <span className="result__num" style={{ color: 'var(--amber)' }}>
                  {tally.weak}
                </span>
                <span className="result__cap">苦手</span>
              </div>
              <div className="result__cell">
                <span className="result__num" style={{ color: 'var(--text-dim)' }}>
                  {tally.new}
                </span>
                <span className="result__cap">まだ</span>
              </div>
            </div>
            <div className="result__actions">
              {tally.weak > 0 && (
                <button className="btn btn--primary btn--block" onClick={() => onRestart('weak')}>
                  苦手だけもう一度
                </button>
              )}
              <button className="btn btn--block" onClick={() => onRestart('same')}>
                同じ条件でもう一度
              </button>
              <button className="btn btn--ghost btn--block" onClick={onExit}>
                ホームへ戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const current = card as Card
  const front = direction === 'ja-en' ? current.ja : current.en
  const back = direction === 'ja-en' ? current.en : current.ja
  const frontIsEnglish = direction === 'en-ja'

  return (
    <div className="study">
      <div className="study__bar">
        <span className="study__title">{title}</span>
        <span className="study__count">
          {index + 1} / {cards.length}
        </span>
        <button
          className="icon-btn"
          onClick={() => setDirection((d) => (d === 'ja-en' ? 'en-ja' : 'ja-en'))}
          aria-label={direction === 'ja-en' ? '英文から始める' : '日本語から始める'}
          title={direction === 'ja-en' ? '日本語 → 英文' : '英文 → 日本語'}
        >
          <IconSwap />
        </button>
        <button className="icon-btn" onClick={onExit} aria-label="学習をやめる">
          <IconClose />
        </button>
      </div>

      <div className="progress">
        <div className="progress__fill" style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>

      <div className="stage">
        <div className={revealed ? 'flip is-revealed' : 'flip'}>
          <div className="flip__inner">
            <button
              className="face"
              onClick={reveal}
              tabIndex={revealed ? -1 : 0}
              aria-hidden={revealed}
            >
              <span className="face__label">{frontIsEnglish ? 'English' : '日本語'}</span>
              <p className={frontIsEnglish ? 'face__prompt en' : 'face__prompt'}>{front}</p>
              <span className="face__hint">
                タップして{frontIsEnglish ? '訳' : '英文'}を確かめる
              </span>
            </button>

            <div className="face face--back" aria-hidden={!revealed}>
              <span className="face__label">{frontIsEnglish ? '日本語' : 'English'}</span>
              <p className={frontIsEnglish ? 'face__answer' : 'face__answer en'}>{back}</p>
              <p className="face__echo">{front}</p>
              {canSpeak && (
                <button
                  className="speak-btn"
                  onClick={() => speak(current.en)}
                  tabIndex={revealed ? 0 : -1}
                >
                  <IconSound />
                  発音を聴く
                </button>
              )}
            </div>
          </div>
        </div>

        {revealed ? (
          <div className="grades rise">
            {GRADES.map((g) => (
              <button
                key={g.status}
                className={`grade ${g.modifier}`}
                onClick={() => grade(g.status)}
                disabled={locked}
              >
                <span className="grade__label">{g.label}</span>
                <span className="grade__key">{g.key}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="reveal-cue">SPACE / タップ でめくる</p>
        )}
      </div>
    </div>
  )
}
