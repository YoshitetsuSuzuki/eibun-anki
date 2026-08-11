// 最小限のオフライン対応。取得できたものを溜め、次回は即座に返しつつ裏で更新する。
const CACHE = 'eibun-anki-v1'
const INDEX = new URL('./', self.location).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([INDEX]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(request)

      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => null)

      if (cached) return cached

      const fresh = await network
      if (fresh) return fresh

      if (request.mode === 'navigate') {
        const fallback = await cache.match(INDEX)
        if (fallback) return fallback
      }
      return new Response('offline', { status: 503, statusText: 'offline' })
    })(),
  )
})
