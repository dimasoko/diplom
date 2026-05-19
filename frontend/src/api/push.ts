import { apiClient } from './client'

type ApiEnvelope<T> = {
  success: boolean
  data: T
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export async function registerPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser')
  }

  const swRegistration = await navigator.serviceWorker.register('/sw.js')
  const keyResponse = await apiClient.get<ApiEnvelope<{ publicKey: string }>>('/push/public-key')
  const publicKey = keyResponse.data.data.publicKey

  const subscription = await swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const json = subscription.toJSON()

  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('Invalid push subscription payload')
  }

  await apiClient.post('/push/subscribe', {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  })
}
