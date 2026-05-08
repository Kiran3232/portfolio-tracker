export type ProviderType =
  | 'zerodha'
  | 'indmoney'
  | 'smallcase'
  | 'tickertape'
  | 'gmail'

export type ConnectionStatus =
  | 'connected'
  | 'syncing'
  | 'manual'
  | 'error'
  | 'disconnected'

export interface HoldingRecord {
  id: string
  instrumentId?: string
  instrumentToken?: number | null
  symbol?: string
  exchange?: string | null
  segment?: string | null
  isin?: string | null
  product?: string | null
  name: string
  type?: string
  source: ProviderType | string
  provider?: ProviderType | string
  quantity: number
  avgBuyPrice: number
  currentPrice: number
  currentValue: number
  currency?: 'INR' | 'USD' | string
  pnl?: number
  dayChange?: number
  dayChangePercentage?: number
  updatedAt?: unknown
}

export interface LiabilityRecord {
  id: string
  provider: string
  type?: string
  accountNumberMasked?: string
  currentOutstanding: number
  dueAmount?: number
  dueDate?: string
  utilization?: number
  source?: string
  sourceMessageId?: string
  updatedAt?: unknown
  currency?: 'INR' | 'USD' | string
}

export interface StatementRecord {
  id: string
  provider: string
  type?: string
  source?: string
  subject?: string
  from?: string
  snippet?: string
  attachmentName?: string | null
  attachmentNames?: string[]
  parsed?: boolean
  statementSummary?: {
    totalDue?: number
    minimumDue?: number
    dueDate?: string
    transactionCount?: number
  }
  createdAt?: unknown
  updatedAt?: unknown
}

export interface ConnectionRecord {
  provider: ProviderType
  status: ConnectionStatus
  lastSyncAt?: unknown
  accountLabel?: string
  metadata?: Record<string, unknown>
}