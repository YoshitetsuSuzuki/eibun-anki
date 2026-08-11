import { uid } from './id'

export type ParsedRow = {
  id: string
  en: string
  ja: string
}

export type RowIssue = 'incomplete' | 'duplicate' | null

export type AnnotatedRow = {
  row: ParsedRow
  issue: RowIssue
}

/**
 * 日本語（かな・漢字・和文約物）の検出。
 * ・(U+30FB) は箇条書き記号としても使われるため、判定対象から外している。
 */
const JA_RE =
  /[ぁ-ヺー-ヿ㐀-䶿一-鿿豈-﫿々〆、。「-】〜！？～]/

const LATIN_RE = /[A-Za-z]/

/** 行頭の箇条書き記号・連番を落とす。英文の "I." を壊さないよう英字連番は対象外。 */
const BULLET_RE =
  /^\s*(?:[-–—*+・•‣▪■□●○◆◇▶>»※]+|[0-9０-９]+\s*[.)．）、:：]|[(（][0-9０-９]+[)）]|[①-⑳]|[❶-❿]|[Ⅰ-Ⅹ]\s*[.)．）])\s*/

/** 区切り記号。左に置いたものほど優先度が高い。 */
const DELIMITERS = ['\t', '｜', '|', '⇒', '→', '::', '＝', '=', '：', '／', ' / ', '　']

/** 英文側の末尾に残りがちな区切り記号の名残を掃除する。 */
const TRAILING_SEP_RE = /[\s:：=＝\-–—|｜/／]+$/
const LEADING_SEP_RE = /^[\s:：=＝\-–—|｜/／]+/

export function hasJapanese(text: string): boolean {
  return JA_RE.test(text)
}

export function hasLatin(text: string): boolean {
  return LATIN_RE.test(text)
}

export function stripBullet(line: string): string {
  return line.replace(BULLET_RE, '').trim()
}

type Pair = { en: string; ja: string }

function pairFrom(a: string, b: string): Pair | null {
  const left = a.trim()
  const right = b.trim()
  if (!left || !right) return null
  const jaLeft = hasJapanese(left)
  const jaRight = hasJapanese(right)
  if (jaLeft === jaRight) return null
  const en = jaLeft ? right : left
  if (!hasLatin(en)) return null
  return jaLeft ? { en: right, ja: left } : { en: left, ja: right }
}

/** 1 行の中に英文と訳文が同居している場合に分割する。できなければ null。 */
export function splitInline(line: string): Pair | null {
  for (const delimiter of DELIMITERS) {
    let from = 0
    for (;;) {
      const at = line.indexOf(delimiter, from)
      if (at < 0) break
      const pair = pairFrom(line.slice(0, at), line.slice(at + delimiter.length))
      if (pair) return pair
      from = at + delimiter.length
    }
  }
  return splitAtScriptBoundary(line)
}

/** 区切り記号がなくても「英文 日本語訳」のように文字種が切り替わる箇所で分ける。 */
function splitAtScriptBoundary(line: string): Pair | null {
  if (!hasJapanese(line) || !hasLatin(line)) return null

  const chars = [...line]
  const firstJa = chars.findIndex((c) => JA_RE.test(c))
  const lastJa = chars.length - 1 - [...chars].reverse().findIndex((c) => JA_RE.test(c))

  if (firstJa > 0) {
    const left = chars.slice(0, firstJa).join('')
    const right = chars.slice(firstJa).join('')
    if (!hasJapanese(left) && hasLatin(left)) {
      const en = left.replace(TRAILING_SEP_RE, '').trim()
      if (en) return { en, ja: right.trim() }
    }
  }

  if (lastJa < chars.length - 1) {
    const left = chars.slice(0, lastJa + 1).join('')
    const right = chars.slice(lastJa + 1).join('')
    if (!hasJapanese(right) && hasLatin(right)) {
      const en = right.replace(LEADING_SEP_RE, '').trim()
      if (en) return { en, ja: left.trim() }
    }
  }

  return null
}

/**
 * 貼り付けたテキストをカードの元データに変換する。
 * 1 行完結・2 行 1 組のどちらでも受け付け、英日の順序も問わない。
 * 相方が見つからない行は捨てずに片側だけ埋めて返し、画面上で直せるようにする。
 */
export function parseCards(text: string): ParsedRow[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(stripBullet)
    .filter((line) => line.length > 0)

  const rows: ParsedRow[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] as string

    const inline = splitInline(line)
    if (inline) {
      rows.push({ id: uid('row'), en: inline.en, ja: inline.ja })
      i += 1
      continue
    }

    const next = i + 1 < lines.length ? (lines[i + 1] as string) : null
    if (next !== null && !splitInline(next)) {
      const pair = pairFrom(line, next)
      if (pair) {
        rows.push({ id: uid('row'), en: pair.en, ja: pair.ja })
        i += 2
        continue
      }
    }

    // 相方が見つからなかった行。文字種に応じた側へ入れておく。
    rows.push(
      hasJapanese(line)
        ? { id: uid('row'), en: '', ja: line }
        : { id: uid('row'), en: line, ja: '' },
    )
    i += 1
  }

  return rows
}

/** 重複判定用のキー。大文字小文字・空白・末尾の句読点の差を吸収する。 */
export function enKey(en: string): string {
  return en
    .toLowerCase()
    .replace(/[\s　]+/g, ' ')
    .replace(/[.!?？！。,、;:'"“”‘’]+$/g, '')
    .trim()
}

/** プレビュー表示用に、未完成行と重複行へ印を付ける。 */
export function annotateRows(rows: ParsedRow[], existingEnKeys: Set<string> = new Set()): AnnotatedRow[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    const en = row.en.trim()
    const ja = row.ja.trim()
    if (!en || !ja) return { row, issue: 'incomplete' as const }

    const key = enKey(en)
    if (seen.has(key) || existingEnKeys.has(key)) return { row, issue: 'duplicate' as const }
    seen.add(key)
    return { row, issue: null }
  })
}
