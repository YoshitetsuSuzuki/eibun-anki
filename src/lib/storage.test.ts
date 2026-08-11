import { describe, expect, it } from 'vitest'
import type { AppState } from '../types'
import {
  STORAGE_KEY,
  defaultState,
  loadState,
  mergeState,
  sanitizeState,
  saveState,
  type StorageLike,
} from './storage'

function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value
    },
  }
}

const sample = (): AppState => ({
  version: 1,
  decks: [{ id: 'd1', name: 'ビジネス英会話', createdAt: 100 }],
  cards: [
    {
      id: 'c1',
      deckId: 'd1',
      en: 'Let me get back to you.',
      ja: '折り返しご連絡します。',
      status: 'weak',
      reviewCount: 3,
      lastReviewedAt: 200,
    },
  ],
  settings: { theme: 'dark', speakOnReveal: true },
})

describe('sanitizeState', () => {
  it('正しい形はそのまま通す', () => {
    expect(sanitizeState(sample())).toEqual(sample())
  })

  it('オブジェクトでなければ null', () => {
    expect(sanitizeState('壊れた')).toBeNull()
    expect(sanitizeState(null)).toBeNull()
  })

  it('decks が配列でなければ null', () => {
    expect(sanitizeState({ decks: 'x', cards: [] })).toBeNull()
  })

  it('存在しないデッキに属するカードは捨てる', () => {
    const state = sample()
    state.cards[0]!.deckId = 'missing'
    expect(sanitizeState(state)?.cards).toEqual([])
  })

  it('空のカードは捨てる', () => {
    const state = sample()
    state.cards[0]!.ja = '  '
    expect(sanitizeState(state)?.cards).toEqual([])
  })

  it('不正なステータスは new に倒す', () => {
    const state = JSON.parse(JSON.stringify(sample()))
    state.cards[0].status = 'perfect'
    expect(sanitizeState(state)?.cards[0]?.status).toBe('new')
  })

  it('ID の重複は先勝ちで除去する', () => {
    const state = sample()
    state.cards.push({ ...state.cards[0]!, ja: '別の訳' })
    expect(sanitizeState(state)?.cards).toHaveLength(1)
  })

  it('設定が欠けていれば既定値で補う', () => {
    expect(sanitizeState({ decks: [], cards: [] })?.settings).toEqual({
      theme: 'dark',
      speakOnReveal: false,
    })
  })
})

describe('loadState / saveState', () => {
  it('保存して読み戻せる', () => {
    const storage = fakeStorage()
    saveState(storage, sample())
    expect(loadState(storage)).toEqual(sample())
  })

  it('未保存なら初期状態', () => {
    expect(loadState(fakeStorage())).toEqual(defaultState())
  })

  it('壊れた JSON なら初期状態に戻す', () => {
    expect(loadState(fakeStorage({ [STORAGE_KEY]: '{{{' }))).toEqual(defaultState())
  })

  it('読み出しが例外を投げても初期状態を返す', () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {},
    }
    expect(loadState(storage)).toEqual(defaultState())
  })

  it('保存が例外を投げても落ちない', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(() => saveState(storage, sample())).not.toThrow()
  })
})

describe('mergeState', () => {
  it('replace は取り込んだ内容で置き換える', () => {
    expect(mergeState(sample(), defaultState(), 'replace')).toEqual(defaultState())
  })

  it('append はデッキを足す', () => {
    const incoming: AppState = {
      ...defaultState(),
      decks: [{ id: 'd9', name: '旅行編', createdAt: 1 }],
      cards: [
        {
          id: 'c9',
          deckId: 'd9',
          en: 'Where is the station?',
          ja: '駅はどこですか。',
          status: 'new',
          reviewCount: 0,
          lastReviewedAt: null,
        },
      ],
    }
    const merged = mergeState(sample(), incoming, 'append')
    expect(merged.decks.map((d) => d.name)).toEqual(['ビジネス英会話', '旅行編'])
    expect(merged.cards).toHaveLength(2)
  })

  it('append で ID がぶつかっても両方残す', () => {
    const merged = mergeState(sample(), sample(), 'append')
    expect(merged.decks).toHaveLength(2)
    expect(merged.cards).toHaveLength(2)
    expect(new Set(merged.decks.map((d) => d.id)).size).toBe(2)
    expect(new Set(merged.cards.map((c) => c.id)).size).toBe(2)
    expect(merged.cards[1]?.deckId).toBe(merged.decks[1]?.id)
  })
})
