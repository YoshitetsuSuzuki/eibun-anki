import { describe, expect, it } from 'vitest'
import type { AppState } from '../types'
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
} from './actions'
import { defaultState } from './storage'

const rows = [
  { id: 'r1', en: 'I am hungry.', ja: 'お腹が空いた。' },
  { id: 'r2', en: 'I am tired.', ja: '疲れました。' },
]

function seeded(): AppState {
  return addDeck(defaultState(), 'ビジネス英会話', rows, 1000)
}

describe('addDeck', () => {
  it('デッキとカードを追加する', () => {
    const state = seeded()
    expect(state.decks).toHaveLength(1)
    expect(state.decks[0]?.name).toBe('ビジネス英会話')
    expect(state.cards).toHaveLength(2)
    expect(state.cards[0]?.deckId).toBe(state.decks[0]?.id)
    expect(state.cards[0]?.status).toBe('new')
  })

  it('片側が空の行は取り込まない', () => {
    const state = addDeck(defaultState(), 'x', [{ id: 'r', en: 'only english', ja: '' }], 1)
    expect(state).toEqual(defaultState())
  })

  it('デッキ名が空なら連番で補う', () => {
    const state = addDeck(defaultState(), '   ', rows, 1)
    expect(state.decks[0]?.name).toBe('デッキ 1')
  })

  it('前後の空白は落として保存する', () => {
    const state = addDeck(defaultState(), 'x', [{ id: 'r', en: '  hi  ', ja: '  やあ  ' }], 1)
    expect(state.cards[0]).toMatchObject({ en: 'hi', ja: 'やあ' })
  })
})

describe('appendToDeck', () => {
  it('既存デッキにカードを足す', () => {
    const state = seeded()
    const deckId = state.decks[0]!.id
    const next = appendToDeck(state, deckId, [{ id: 'r3', en: 'See you.', ja: 'またね。' }])
    expect(next.cards).toHaveLength(3)
    expect(next.decks).toHaveLength(1)
  })

  it('存在しないデッキなら何もしない', () => {
    const state = seeded()
    expect(appendToDeck(state, 'missing', rows)).toBe(state)
  })
})

describe('setCardStatus', () => {
  it('ステータスと復習回数を更新する', () => {
    const state = seeded()
    const cardId = state.cards[0]!.id
    const next = setCardStatus(state, cardId, 'weak', 5000)
    expect(next.cards[0]).toMatchObject({ status: 'weak', reviewCount: 1, lastReviewedAt: 5000 })
    expect(next.cards[1]).toEqual(state.cards[1])
  })

  it('元の状態を書き換えない', () => {
    const state = seeded()
    setCardStatus(state, state.cards[0]!.id, 'known', 1)
    expect(state.cards[0]?.status).toBe('new')
  })
})

describe('updateCardText', () => {
  it('英文と訳文を差し替える', () => {
    const state = seeded()
    const next = updateCardText(state, state.cards[0]!.id, 'I am starving.', 'とてもお腹が空いた。')
    expect(next.cards[0]).toMatchObject({ en: 'I am starving.', ja: 'とてもお腹が空いた。' })
  })

  it('空にはできない', () => {
    const state = seeded()
    expect(updateCardText(state, state.cards[0]!.id, '', 'x')).toBe(state)
  })
})

describe('deleteCard / deleteDeck', () => {
  it('カードを 1 枚消す', () => {
    const state = seeded()
    expect(deleteCard(state, state.cards[0]!.id).cards).toHaveLength(1)
  })

  it('デッキを消すと所属カードも消える', () => {
    const state = seeded()
    const next = deleteDeck(state, state.decks[0]!.id)
    expect(next.decks).toHaveLength(0)
    expect(next.cards).toHaveLength(0)
  })
})

describe('renameDeck', () => {
  it('名前を変える', () => {
    const state = seeded()
    expect(renameDeck(state, state.decks[0]!.id, '旅行編').decks[0]?.name).toBe('旅行編')
  })

  it('空の名前は拒否する', () => {
    const state = seeded()
    expect(renameDeck(state, state.decks[0]!.id, '  ')).toBe(state)
  })
})

describe('resetProgress', () => {
  it('デッキ単位で未学習に戻す', () => {
    let state = seeded()
    state = setCardStatus(state, state.cards[0]!.id, 'known', 1)
    const next = resetProgress(state, state.decks[0]!.id)
    expect(next.cards.every((c) => c.status === 'new' && c.reviewCount === 0)).toBe(true)
  })

  it('null なら全デッキが対象', () => {
    let state = seeded()
    state = setCardStatus(state, state.cards[0]!.id, 'weak', 1)
    expect(resetProgress(state, null).cards.every((c) => c.status === 'new')).toBe(true)
  })
})

describe('updateSettings', () => {
  it('一部だけ差し替える', () => {
    const next = updateSettings(defaultState(), { theme: 'light' })
    expect(next.settings).toEqual({ theme: 'light', speakOnReveal: false })
  })
})
