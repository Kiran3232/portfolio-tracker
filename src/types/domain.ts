export type ProviderId = 'zerodha' | 'indmoney' | 'smallcase' | 'tickertape' | 'gmail'

export interface ConnectionRecord {
  provider: ProviderId
  status: 'connected' | 'syncing' | 'manual' | 'disconnected' | 'error'
  lastSyncAt?: string
  accountLabel?: string
  metadata?: Record<string, unknown>
}

export interface HoldingRecord {
  id: string
  userId: string
  source: ProviderId | 'manual'
  instrumentId: string
  symbol: string
  name: string
  type: 'stock' | 'etf' | 'mutual_fund' | 'smallcase' | 'cash'
  quantity: number
  avgBuyPrice: number
  currentPrice: number
  currentValue: number
  currency: 'INR' | 'USD'
  updatedAt?: string
}

export interface LiabilityRecord {
  id: string
  userId: string
  type: 'credit_card' | 'loan' | 'emi'
  provider: string
  accountNumberMasked: string
  currentOutstanding: number
  dueAmount: number
  dueDate: string
  utilization?: number
  updatedAt?: string
}

export interface StatementRecord {
  id: string
  userId: string
  type: 'credit_card' | 'bank'
  provider: string
  gmailMessageId?: string
  attachmentName?: string
  subject?: string
  parsed: boolean
  statementSummary?: {
    totalDue?: number
    minimumDue?: number
    dueDate?: string
    transactionCount?: number
  }
  parsedText?: string
  createdAt?: string | { toDate: () => Date }
}
