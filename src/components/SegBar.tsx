import type { Stats } from '../lib/study'

type Props = {
  stats: Stats
  thin?: boolean
}

/** 覚えた / 苦手 / 未学習 の内訳を 1 本の帯で示す。 */
export function SegBar({ stats, thin = false }: Props) {
  const total = Math.max(stats.total, 1)
  const pct = (n: number) => `${(n / total) * 100}%`

  return (
    <div
      className={thin ? 'segbar segbar--thin' : 'segbar'}
      role="img"
      aria-label={`覚えた ${stats.known}、苦手 ${stats.weak}、未学習 ${stats.new}`}
    >
      <span className="seg seg--known" style={{ width: pct(stats.known) }} />
      <span className="seg seg--weak" style={{ width: pct(stats.weak) }} />
      <span className="seg seg--new" style={{ width: pct(stats.new) }} />
    </div>
  )
}
