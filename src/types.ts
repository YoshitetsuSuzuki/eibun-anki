export type Status = 'new' | 'weak' | 'known'

export const STATUSES: Status[] = ['new', 'weak', 'known']

export type Deck = {
  id: string
  name: string
  createdAt: number
}

export type Card = {
  id: string
  deckId: string
  en: string
  ja: string
  status: Status
  reviewCount: number
  lastReviewedAt: number | null
}

export type Theme = 'dark' | 'light'

export type Settings = {
  theme: Theme
  speakOnReveal: boolean
}

export type AppState = {
  version: 1
  decks: Deck[]
  cards: Card[]
  settings: Settings
}

export type Direction = 'ja-en' | 'en-ja'

/** 学習セッションの出題条件。苦手テストもこの形で表現する。 */
export type SessionSpec = {
  /** 対象デッキ。null は全デッキ横断。 */
  deckId: string | null
  /** 対象ステータス。空配列は全件。 */
  statuses: Status[]
  direction: Direction
}
