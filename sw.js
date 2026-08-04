const CACHE_NAME = 'papagan-v1'
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
]

// 安装 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  )
  self.skipWaiting()
})

// 激活 Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// 拦截请求
self.addEventListener('fetch', event => {
  // 跳过 API 请求（DashScope）
  if (event.request.url.includes('dashscope.aliyuncs.com')) {
    return
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 缓存命中则返回，否则从网络获取
        if (response) {
          return response
        }
        return fetch(event.request).then(response => {
          // 只缓存静态资源
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache)
          })
          return response
        })
      })
  )
})
