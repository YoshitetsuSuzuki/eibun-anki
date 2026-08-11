// 最小限のオフライン対応。
// ページ本体は「まず通信、駄目ならキャッシュ」。更新が次の訪問に持ち越されないようにするため。
// アセットはファイル名にハッシュが付くので、キャッシュを優先しつつ裏で拾い直す。
const CACHE = 'eibun-anki-v2'
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

  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request))
})

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) ?? (await cache.match(INDEX)) ?? offline()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  if (cached) return cached
  return (await network) ?? offline()
}

function offline() {
  return new Response('offline', { status: 503, statusText: 'offline' })
}
