import type { AppState } from '../types'

export function backupFilename(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `eibun-anki-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.json`
}

export function downloadState(state: AppState, now: Date = new Date()): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = backupFilename(now)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** ファイル選択ダイアログを開き、選ばれた JSON を返す。取り消されたら null。 */
export function pickJsonFile(): Promise<unknown | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      file
        .text()
        .then((text) => {
          try {
            resolve(JSON.parse(text))
          } catch {
            resolve(null)
          }
        })
        .catch(() => resolve(null))
    })
    input.click()
  })
}
