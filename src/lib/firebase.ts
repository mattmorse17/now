import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

function getFirebaseMessaging(): Messaging | null {
  if (!firebaseConfig.apiKey) return null

  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  if (!messaging) {
    messaging = getMessaging(app)
  }
  return messaging
}

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const m = getFirebaseMessaging()
    if (!m) return null

    const token = await getToken(m, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    })
    return token
  } catch {
    return null
  }
}

export function onPushMessage(handler: (payload: { title: string; body: string; data?: Record<string, string> }) => void) {
  const m = getFirebaseMessaging()
  if (!m) return () => {}

  return onMessage(m, (payload) => {
    handler({
      title: payload.notification?.title || 'Now',
      body: payload.notification?.body || '',
      data: payload.data,
    })
  })
}

export async function sendPushNotification(params: {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}) {
  // This calls our Edge Function / server endpoint
  await fetch('/api/notifications/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}
