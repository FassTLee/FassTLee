// Kinepia Service Worker — PWA-A1-1
// 설치 가능 상태 확보용 최소 구현. 캐시 전략은 B단계에서 별도 처리.
// Chrome 설치 요건상 fetch 핸들러 자체는 반드시 존재해야 하므로,
// 캐시 없이 네트워크로 그대로 통과시키는 핸들러만 둔다.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // 캐시 전략 없음 — 브라우저 기본 네트워크 동작에 그대로 위임.
  // (respondWith를 호출하지 않으면 요청은 정상적으로 네트워크로 진행됨)
})
