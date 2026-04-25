const CACHE = 'fazendagest-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)

  // Cache-first for Next.js static assets and fonts/images
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff|woff2)$/)
  ) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request)
        if (cached) return cached
        const response = await fetch(e.request)
        if (response.ok) cache.put(e.request, response.clone())
        return response
      })
    )
    return
  }

  // Network-first for all other requests (navigation, API, etc.)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
