import type { AppState, Card, Settings, Status } from '../types'
import { uid } from './id'
import type { ParsedRow } from './parser'

/** 取り込んだ行を新しいデッキとして追加する。空の行は無視する。 */
export function addDeck(state: AppState, name: string, rows: ParsedRow[], now: number): AppState {
  const usable = rows.filter((row) => row.en.trim() && row.ja.trim())
  if (usable.length === 0) return state

  const deckId = uid('deck')
  const deckName = name.trim() || `デッキ ${state.decks.length + 1}`
  const cards: Card[] = usable.map((row) => ({
    id: uid('card'),
    deckId,
    en: row.en.trim(),
    ja: row.ja.trim(),
    status: 'new',
    reviewCount: 0,
    lastReviewedAt: null,
  }))

  return {
    ...state,
    decks: [...state.decks, { id: deckId, name: deckName, createdAt: now }],
    cards: [...state.cards, ...cards],
  }
}

/** 既存デッキへの追記。 */
export function appendToDeck(state: AppState, deckId: string, rows: ParsedRow[]): AppState {
  if (!state.decks.some((deck) => deck.id === deckId)) return state
  const usable = rows.filter((row) => row.en.trim() && row.ja.trim())
  if (usable.length === 0) return state

  const cards: Card[] = usable.map((row) => ({
    id: uid('card'),
    deckId,
    en: row.en.trim(),
    ja: row.ja.trim(),
    status: 'new',
    reviewCount: 0,
    lastReviewedAt: null,
  }))

  return { ...state, cards: [...state.cards, ...cards] }
}

export function setCardStatus(state: AppState, cardId: string, status: Status, now: number): AppState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? { ...card, status, reviewCount: card.reviewCount + 1, lastReviewedAt: now }
        : card,
    ),
  }
}

export function updateCardText(state: AppState, cardId: string, en: string, ja: string): AppState {
  if (!en.trim() || !ja.trim()) return state
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId ? { ...card, en: en.trim(), ja: ja.trim() } : card,
    ),
  }
}

export function deleteCard(state: AppState, cardId: string): AppState {
  return { ...state, cards: state.cards.filter((card) => card.id !== cardId) }
}

export function renameDeck(state: AppState, deckId: string, name: string): AppState {
  const trimmed = name.trim()
  if (!trimmed) return state
  return {
    ...state,
    decks: state.decks.map((deck) => (deck.id === deckId ? { ...deck, name: trimmed } : deck)),
  }
}

export function deleteDeck(state: AppState, deckId: string): AppState {
  return {
    ...state,
    decks: state.decks.filter((deck) => deck.id !== deckId),
    cards: state.cards.filter((card) => card.deckId !== deckId),
  }
}

/** デッキ内の全カードを未学習に戻す。deckId が null なら全体。 */
export function resetProgress(state: AppState, deckId: string | null): AppState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      deckId === null || card.deckId === deckId
        ? { ...card, status: 'new', reviewCount: 0, lastReviewedAt: null }
        : card,
    ),
  }
}

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  return { ...state, settings: { ...state.settings, ...patch } }
}
