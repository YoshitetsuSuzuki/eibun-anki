/** カード盤面の並び順と表裏を扱う。React の外で完結させてテストできるようにしてある。 */

export type Side = 'ja' | 'en'

export function otherSide(side: Side): Side {
  return side === 'ja' ? 'en' : 'ja'
}

/**
 * 手元の並び順を、現在のカード一覧に合わせて最小限だけ直す。
 * 並べ替えた順序は保ったまま、消えた ID を落とし、増えた ID を末尾に足す。
 * 変更が無ければ同じ配列をそのまま返す（再描画を無駄に起こさないため）。
 */
export function syncOrder(prev: string[], ids: string[]): string[] {
  const live = new Set(ids)
  const kept = prev.filter((id) => live.has(id))
  const known = new Set(kept)
  const added = ids.filter((id) => !known.has(id))
  if (added.length === 0 && kept.length === prev.length) return prev
  return [...kept, ...added]
}

/** 並び順に沿って要素を並べ直す。順序に無い ID は末尾に回す。 */
export function applyOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const result: T[] = []
  for (const id of order) {
    const item = byId.get(id)
    if (item) {
      result.push(item)
      byId.delete(id)
    }
  }
  for (const item of byId.values()) result.push(item)
  return result
}
