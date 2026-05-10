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
  return data as {
    imported: number
    liabilitiesImported: number
    messages: number
  }
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

export async function uploadIndmoneyReports(
  holdingsFile: File,
  ordersFile: File
): Promise<{
  importedHoldings: number
  importedTransactions: number
  broker: string | null
  brokerAccount: string
}> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Not signed in')
  }

  const idToken = await user.getIdToken(true)
  const formData = new FormData()
  formData.append('holdings', holdingsFile)
  formData.append('orders', ordersFile)

  const res = await fetch(`${API_BASE_URL}/api/indmoney/import`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
  })

  if (!res.ok) {
    let message = `API error ${res.status}`
    try {
      const errorData = await res.json()
      message = errorData.error || message
    } catch {
      // ignore json parse failure
    }
    throw new Error(message)
  }

  return res.json()
}

export async function markStatementPaid(statementId: string) {
  const data = await authorizedFetch(`/api/statements/${statementId}/mark-paid`, {
    method: 'POST',
  })
  return data as { ok: true; liabilitiesImported: number }
}

export async function markStatementUnpaid(statementId: string) {
  const data = await authorizedFetch(`/api/statements/${statementId}/mark-unpaid`, {
    method: 'POST',
  })
  return data as { ok: true; liabilitiesImported: number }
}

export async function createFixedDeposit(payload: {
  bankName: string
  amount: number
  interestRate?: number | null
  startDate: string
  maturityDate: string
  maturityAmount: number
  compoundFrequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'
  accountNumberLast4?: string | null
  currency?: 'INR' | 'USD'
}) {
  const data = await authorizedFetch('/api/fixed-deposits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return data as { ok: true; id: string }
}


export async function updateFixedDeposit(
  fixedDepositId: string,
  payload: {
    bankName: string
    amount: number
    interestRate?: number | null
    startDate: string
    maturityDate: string
    maturityAmount: number
    compoundFrequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'
    accountNumberLast4?: string | null
    currency?: 'INR' | 'USD'
  }
) {
  const data = await authorizedFetch(`/api/fixed-deposits/${fixedDepositId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return data as { ok: true; id: string }
}

export async function deleteFixedDeposit(fixedDepositId: string) {
  const data = await authorizedFetch(`/api/fixed-deposits/${fixedDepositId}`, {
    method: 'DELETE',
  })
  return data as { ok: true; id: string }
}