let counter = 0

/** 端末内で衝突しない程度の短い ID。永続化されるので読みやすさより安定性を優先。 */
export function uid(prefix = 'x'): string {
  counter += 1
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`
}
