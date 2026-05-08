export type Provider = 'zerodha' | 'indmoney' | 'smallcase' | 'gmail' | 'tickertape'

export interface ProviderConnection {
  id: Provider
  name: string
  description: string
  status: 'connected' | 'syncing' | 'manual'
  lastSync: string
}

export interface AssetItem {
  id: string
  name: string
  type: 'Stock' | 'ETF' | 'Mutual Fund' | 'Smallcase' | 'Cash'
  source: string
  value: number
  change: number
}

export interface LiabilityItem {
  id: string
  name: string
  provider: string
  outstanding: number
  dueDate: string
  utilization: number
}

export const connections: ProviderConnection[] = [
  {
    id: 'zerodha',
    name: 'Zerodha',
    description: 'Kite Connect holdings and positions sync',
    status: 'connected',
    lastSync: '8 min ago',
  },
  {
    id: 'indmoney',
    name: 'INDmoney',
    description: 'US equity and ETF positions from INDstocks APIs',
    status: 'syncing',
    lastSync: 'Sync in progress',
  },
  {
    id: 'smallcase',
    name: 'Smallcase',
    description: 'Gateway holdings import for baskets and mutual funds',
    status: 'connected',
    lastSync: '1 hr ago',
  },
  {
    id: 'tickertape',
    name: 'Tickertape',
    description: 'Manual portfolio/watchlist import fallback',
    status: 'manual',
    lastSync: 'Manual CSV required',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read-only sync for statements and account emails',
    status: 'connected',
    lastSync: 'Today, 6:40 PM',
  },
]

export const assets: AssetItem[] = [
  { id: '1', name: 'VTI', type: 'ETF', source: 'INDmoney', value: 312000, change: 4.8 },
  { id: '2', name: 'Nifty 50 Index Fund', type: 'Mutual Fund', source: 'Zerodha', value: 241500, change: 2.1 },
  { id: '3', name: 'Smallcase Momentum', type: 'Smallcase', source: 'Smallcase', value: 184400, change: 6.5 },
  { id: '4', name: 'HDFC Bank', type: 'Stock', source: 'Zerodha', value: 126200, change: -1.4 },
  { id: '5', name: 'Cash Buffer', type: 'Cash', source: 'Firebase', value: 78000, change: 0 },
]

export const liabilities: LiabilityItem[] = [
  { id: 'l1', name: 'HDFC Regalia', provider: 'HDFC Bank', outstanding: 28450, dueDate: '12 May', utilization: 28 },
  { id: 'l2', name: 'ICICI Amazon Pay', provider: 'ICICI Bank', outstanding: 14220, dueDate: '18 May', utilization: 19 },
  { id: 'l3', name: 'Axis Ace', provider: 'Axis Bank', outstanding: 8650, dueDate: '24 May', utilization: 11 },
]

export const allocation = [
  { name: 'ETFs', value: 34 },
  { name: 'Mutual Funds', value: 27 },
  { name: 'Stocks', value: 18 },
  { name: 'Smallcases', value: 13 },
  { name: 'Cash', value: 8 },
]

export const monthlyTrend = [
  { month: 'Jan', assets: 7.4, liabilities: 0.42 },
  { month: 'Feb', assets: 7.6, liabilities: 0.39 },
  { month: 'Mar', assets: 7.8, liabilities: 0.44 },
  { month: 'Apr', assets: 8.1, liabilities: 0.47 },
  { month: 'May', assets: 8.4, liabilities: 0.51 },
]
