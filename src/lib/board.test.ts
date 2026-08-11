import { describe, expect, it } from 'vitest'
import { applyOrder, otherSide, syncOrder } from './board'

describe('otherSide', () => {
  it('日本語と英語を入れ替える', () => {
    expect(otherSide('ja')).toBe('en')
    expect(otherSide('en')).toBe('ja')
  })
})

describe('syncOrder', () => {
  it('変化がなければ同じ配列を返す', () => {
    const prev = ['a', 'b', 'c']
    expect(syncOrder(prev, ['a', 'b', 'c'])).toBe(prev)
  })

  it('並べ替えた順序を保つ', () => {
    expect(syncOrder(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b'])
  })

  it('消えた ID を落とす', () => {
    expect(syncOrder(['c', 'a', 'b'], ['a', 'c'])).toEqual(['c', 'a'])
  })

  it('増えた ID を末尾に足す', () => {
    expect(syncOrder(['c', 'a'], ['a', 'c', 'd'])).toEqual(['c', 'a', 'd'])
  })

  it('入れ替わっても取りこぼさない', () => {
    expect(syncOrder(['a', 'b'], ['c', 'd'])).toEqual(['c', 'd'])
  })

  it('空から始められる', () => {
    expect(syncOrder([], ['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('applyOrder', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('指定の順に並べ替える', () => {
    expect(applyOrder(items, ['c', 'a', 'b']).map((i) => i.id)).toEqual(['c', 'a', 'b'])
  })

  it('順序に無い要素は末尾に回す', () => {
    expect(applyOrder(items, ['c']).map((i) => i.id)).toEqual(['c', 'a', 'b'])
  })

  it('存在しない ID は無視する', () => {
    expect(applyOrder(items, ['zzz', 'b']).map((i) => i.id)).toEqual(['b', 'a', 'c'])
  })
})
