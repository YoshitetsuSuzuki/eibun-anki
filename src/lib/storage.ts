import type { AppState, Card, Deck, Settings, Status } from '../types'

export const STORAGE_KEY = 'eibun-anki:v1'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function defaultSettings(): Settings {
  return { theme: 'dark', speakOnReveal: false }
}

export function defaultState(): AppState {
  return { version: 1, decks: [], cards: [], settings: defaultSettings() }
}

function isStatus(value: unknown): value is Status {
  return value === 'new' || value === 'weak' || value === 'known'
}

function sanitizeDeck(value: unknown): Deck | null {
  if (typeof value !== 'object' || value === null) return null
  const d = value as Record<string, unknown>
  if (typeof d.id !== 'string' || !d.id) return null
  return {
    id: d.id,
    name: typeof d.name === 'string' && d.name.trim() ? d.name : '無題のデッキ',
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
  }
}

function sanitizeCard(value: unknown, deckIds: Set<string>): Card | null {
  if (typeof value !== 'object' || value === null) return null
  const c = value as Record<string, unknown>
  if (typeof c.id !== 'string' || !c.id) return null
  if (typeof c.deckId !== 'string' || !deckIds.has(c.deckId)) return null
  if (typeof c.en !== 'string' || typeof c.ja !== 'string') return null
  if (!c.en.trim() || !c.ja.trim()) return null
  return {
    id: c.id,
    deckId: c.deckId,
    en: c.en,
    ja: c.ja,
    status: isStatus(c.status) ? c.status : 'new',
    reviewCount: typeof c.reviewCount === 'number' && c.reviewCount >= 0 ? c.reviewCount : 0,
    lastReviewedAt: typeof c.lastReviewedAt === 'number' ? c.lastReviewedAt : null,
  }
}

function sanitizeSettings(value: unknown): Settings {
  const base = defaultSettings()
  if (typeof value !== 'object' || value === null) return base
  const s = value as Record<string, unknown>
  return {
    theme: s.theme === 'light' ? 'light' : 'dark',
    speakOnReveal: s.speakOnReveal === true,
  }
}

/** 外から来た JSON を検証して AppState にする。壊れていれば null。 */
export function sanitizeState(value: unknown): AppState | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  if (!Array.isArray(raw.decks) || !Array.isArray(raw.cards)) return null

  const decks: Deck[] = []
  const deckIds = new Set<string>()
  for (const item of raw.decks) {
    const deck = sanitizeDeck(item)
    if (deck && !deckIds.has(deck.id)) {
      decks.push(deck)
      deckIds.add(deck.id)
    }
  }

  const cards: Card[] = []
  const cardIds = new Set<string>()
  for (const item of raw.cards) {
    const card = sanitizeCard(item, deckIds)
    if (card && !cardIds.has(card.id)) {
      cards.push(card)
      cardIds.add(card.id)
    }
  }

  return { version: 1, decks, cards, settings: sanitizeSettings(raw.settings) }
}

export function loadState(storage: StorageLike): AppState {
  let raw: string | null = null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return defaultState()
  }
  if (!raw) return defaultState()

  try {
    return sanitizeState(JSON.parse(raw)) ?? defaultState()
  } catch {
    return defaultState()
  }
}

export function saveState(storage: StorageLike, state: AppState): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 容量超過などは無視する。学習は続けられた方が良い。
  }
}

/** バックアップ JSON の取り込み。置換か追記かを選べる。 */
export function mergeState(current: AppState, incoming: AppState, mode: 'replace' | 'append'): AppState {
  if (mode === 'replace') return incoming

  const deckIds = new Set(current.decks.map((d) => d.id))
  const cardIds = new Set(current.cards.map((c) => c.id))
  const decks = [...current.decks]
  const cards = [...current.cards]

  const remap = new Map<string, string>()
  for (const deck of incoming.decks) {
    const id = deckIds.has(deck.id) ? `${deck.id}_i${decks.length}` : deck.id
    remap.set(deck.id, id)
    deckIds.add(id)
    decks.push({ ...deck, id })
  }
  for (const card of incoming.cards) {
    const deckId = remap.get(card.deckId)
    if (!deckId) continue
    const id = cardIds.has(card.id) ? `${card.id}_i${cards.length}` : card.id
    cardIds.add(id)
    cards.push({ ...card, id, deckId })
  }

  return { ...current, decks, cards }
}
