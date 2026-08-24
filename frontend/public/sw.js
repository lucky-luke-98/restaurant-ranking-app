// Bump VERSION on any change to this file: the browser only re-installs the worker
// when its bytes change, and the cache names below are what `activate` prunes.
const VERSION = 'v2'
const SHELL_CACHE = `resrank-shell-${VERSION}`
const ASSET_CACHE = `resrank-assets-${VERSION}`
const SHELL_URLS = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']
const ASSET_PREFIXES = ['/_expo/', '/icons/', '/assets/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Backend API and map tiles are cross-origin: always straight to network.
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Refresh the cached shell on every successful navigation. Caching it only
          // at install time meant a deploy could never update it, so one failed
          // navigation pinned the app to a stale bundle for good.
          if (response.ok) {
            const copy = response.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() =>
          caches
            .match(request, { ignoreSearch: true })
            .then((hit) => hit || caches.match('/', { ignoreSearch: true }))
        )
    )
    return
  }

  // Asset URLs are content-hashed, so a cache hit is always the right bytes.
  if (ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          })
      )
    )
  }
})
