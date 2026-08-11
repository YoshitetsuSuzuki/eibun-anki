import { describe, expect, it } from 'vitest'
import type { AppState, Card, Status } from '../types'
import { buildSession, cardsOfDeck, selectCards, shuffle, statsOf } from './study'

function card(id: string, deckId: string, status: Status): Card {
  return { id, deckId, en: `en ${id}`, ja: `訳 ${id}`, status, reviewCount: 0, lastReviewedAt: null }
}

const state: AppState = {
  version: 1,
  decks: [
    { id: 'd1', name: 'A', createdAt: 1 },
    { id: 'd2', name: 'B', createdAt: 2 },
  ],
  cards: [
    card('c1', 'd1', 'new'),
    card('c2', 'd1', 'weak'),
    card('c3', 'd1', 'known'),
    card('c4', 'd2', 'weak'),
  ],
  settings: { theme: 'dark', speakOnReveal: false },
}

describe('statsOf', () => {
  it('ステータスごとに数える', () => {
    expect(statsOf(state.cards)).toEqual({ total: 4, new: 1, weak: 2, known: 1 })
  })

  it('空なら全部 0', () => {
    expect(statsOf([])).toEqual({ total: 0, new: 0, weak: 0, known: 0 })
  })
})

describe('cardsOfDeck', () => {
  it('デッキで絞る', () => {
    expect(cardsOfDeck(state, 'd1').map((c) => c.id)).toEqual(['c1', 'c2', 'c3'])
  })
})

describe('selectCards', () => {
  it('全デッキの苦手だけを集める', () => {
    const result = selectCards(state, { deckId: null, statuses: ['weak'], direction: 'ja-en' })
    expect(result.map((c) => c.id)).toEqual(['c2', 'c4'])
  })

  it('デッキとステータスの両方で絞る', () => {
    const result = selectCards(state, { deckId: 'd1', statuses: ['weak', 'new'], direction: 'ja-en' })
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2'])
  })

  it('statuses が空なら全件', () => {
    const result = selectCards(state, { deckId: null, statuses: [], direction: 'ja-en' })
    expect(result).toHaveLength(4)
  })

  it('該当なしなら空配列', () => {
    const result = selectCards(state, { deckId: 'd2', statuses: ['known'], direction: 'ja-en' })
    expect(result).toEqual([])
  })
})

describe('shuffle', () => {
  it('元の配列を変更しない', () => {
    const input = [1, 2, 3]
    shuffle(input, () => 0.5)
    expect(input).toEqual([1, 2, 3])
  })

  it('要素を失わない', () => {
    const input = [1, 2, 3, 4, 5]
    expect([...shuffle(input)].sort()).toEqual(input)
  })

  it('乱数を固定すると順序が決まる', () => {
    const values = [0.9, 0.1, 0.5, 0.3]
    let i = 0
    const random = () => values[i++ % values.length] as number
    expect(shuffle([1, 2, 3, 4, 5], random)).toEqual([3, 4, 2, 1, 5])
  })
})

describe('buildSession', () => {
  it('抽出とシャッフルをまとめて行う', () => {
    const session = buildSession(state, { deckId: null, statuses: ['weak'], direction: 'ja-en' }, () => 0)
    expect(session.map((c) => c.id).sort()).toEqual(['c2', 'c4'])
  })
})
