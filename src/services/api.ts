import { auth } from '../lib/firebase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

async function authorizedFetch(path: string, options: RequestInit = {}) {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Not signed in')
  }

  const idToken = await user.getIdToken(true)

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    throw new Error(`API error ${res.status}`)
  }

  return res.json()
}

export async function connectZerodha() {
  const data = await authorizedFetch('/api/zerodha/login')
  return data as { url: string }
}

export async function syncZerodha() {
  const data = await authorizedFetch('/api/zerodha/holdings')
  return data as { imported: number }
}

export async function connectGmail() {
  const data = await authorizedFetch('/api/gmail/login')
  return data as { url: string }
}

export async function syncGmailStatements() {
  const data = await authorizedFetch('/api/gmail/statements')
  return data as { imported: number }
}

export async function launchProviderConnect(type: 'zerodha' | 'gmail') {
  if (type === 'zerodha') {
    const payload = await connectZerodha()
    window.open(payload.url, '_blank', 'noopener,noreferrer')
    return
  }

  const payload = await connectGmail()
  window.open(payload.url, '_blank', 'noopener,noreferrer')
}