import type { AppState, Card, SessionSpec, Status } from '../types'

export type Stats = {
  total: number
  new: number
  weak: number
  known: number
}

export function statsOf(cards: Card[]): Stats {
  const stats: Stats = { total: cards.length, new: 0, weak: 0, known: 0 }
  for (const card of cards) stats[card.status] += 1
  return stats
}

export function cardsOfDeck(state: AppState, deckId: string): Card[] {
  return state.cards.filter((card) => card.deckId === deckId)
}

/** Fisher–Yates。乱数を差し替えられるようにしてテスト可能にしてある。 */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const a = result[i] as T
    const b = result[j] as T
    result[i] = b
    result[j] = a
  }
  return result
}

/** 出題条件に合うカードを抽出する（並び順は呼び出し側でシャッフルする）。 */
export function selectCards(state: AppState, spec: SessionSpec): Card[] {
  const statuses = new Set<Status>(spec.statuses)
  return state.cards.filter((card) => {
    if (spec.deckId !== null && card.deckId !== spec.deckId) return false
    if (statuses.size > 0 && !statuses.has(card.status)) return false
    return true
  })
}

export function buildSession(state: AppState, spec: SessionSpec, random?: () => number): Card[] {
  return shuffle(selectCards(state, spec), random)
}
