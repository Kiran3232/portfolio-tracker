import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

const connectZerodhaFn = httpsCallable(functions, 'connectZerodha')
const syncZerodhaFn = httpsCallable(functions, 'syncZerodha')
const connectGmailFn = httpsCallable(functions, 'connectGmail')
const syncGmailFn = httpsCallable(functions, 'syncGmailStatements')

export async function connectZerodha() {
  const result = await connectZerodhaFn()
  return result.data as { url: string }
}

export async function syncZerodha() {
  const result = await syncZerodhaFn()
  return result.data as { queued: boolean; provider: string }
}

export async function connectGmail() {
  const result = await connectGmailFn()
  return result.data as { url: string }
}

export async function syncGmailStatements() {
  const result = await syncGmailFn()
  return result.data as { queued: boolean; provider: string }
}

export async function launchProviderConnect(type: 'zerodha' | 'gmail') {
  if (type === 'zerodha') {
    const payload = await connectZerodha()
    window.open(payload.url, '_blank', 'noopener,noreferrer')
    return
  }

  const payload = await connectGmail()
  window.open(payload.authUrl, '_blank', 'noopener,noreferrer')
}
