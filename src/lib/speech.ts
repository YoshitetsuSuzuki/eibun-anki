/** 端末内蔵の音声合成。API 料金も通信も発生しない。 */

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let cached: SpeechSynthesisVoice | null = null

function englishVoice(): SpeechSynthesisVoice | null {
  if (cached) return cached
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  cached =
    voices.find((v) => v.lang === 'en-US' && v.localService) ??
    voices.find((v) => v.lang.startsWith('en') && v.localService) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  return cached
}

export function speak(text: string): void {
  if (!speechAvailable() || !text.trim()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = englishVoice()
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? 'en-US'
  utterance.rate = 0.95
  synth.speak(utterance)
}

export function stopSpeaking(): void {
  if (speechAvailable()) window.speechSynthesis.cancel()
}

/** 声の一覧は非同期に届くことがあるため、届いたらキャッシュを捨てて拾い直す。 */
export function primeVoices(): void {
  if (!speechAvailable()) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cached = null
  })
}
