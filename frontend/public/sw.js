self.addEventListener('push', (event) => {
  if (!event.data) return

  const payload = event.data.json()
  const title = payload.title || 'we are BASE coffee'
  const options = {
    body: payload.body || '',
    icon: '/assets/base-logo2.png',
    badge: '/assets/base-logo2.png',
    tag: payload.tag || 'base-push',
    data: {
      url: payload.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const windowClient = client
        if ('focus' in windowClient && windowClient.url.includes(self.location.origin)) {
          windowClient.postMessage({ type: 'NAVIGATE', url: targetUrl })
          return windowClient.focus()
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }

      return undefined
    }),
  )
})
