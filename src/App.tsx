import { Bell, LogOut, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssetTable } from './components/AssetTable'
import { AuthPanel } from './components/AuthPanel'
import { AllocationChart, NetworthTrend } from './components/Charts'
import { ConnectionCard } from './components/ConnectionCard'
import { KpiCard } from './components/KpiCard'
import { LiabilityList } from './components/LiabilityList'
import { Sidebar } from './components/Sidebar'
import {
  assets as fallbackAssets,
  connections as fallbackConnections,
  liabilities as fallbackLiabilities,
} from './data/mockData'
import { useAuthSession } from './hooks/useAuthSession'
import { useDashboardRealtime } from './hooks/useDashboardRealtime'
import type { ConnectionRecord } from './types/domain'
import { launchProviderConnect, syncGmailStatements, syncZerodha } from './services/api'

function mapFallbackConnections(): ConnectionRecord[] {
  return fallbackConnections.map((connection) => ({
    provider: connection.id,
    status: connection.status,
    lastSyncAt: connection.lastSync,
    accountLabel: connection.name,
    metadata: { description: connection.description },
  }))
}

export default function App() {
  const { user, loading: authLoading, login, logout } = useAuthSession()
  const { holdings, connections, liabilities, loading } = useDashboardRealtime(user?.uid)
  const [busyProvider, setBusyProvider] = useState<string | null>(null)

  // Search + view-all toggle
  const [searchTerm, setSearchTerm] = useState('')
  const [showAllAssets, setShowAllAssets] = useState(false)

  const resolvedAssets = holdings.length > 0
    ? holdings.map((item) => ({
        id: item.id,
        name: item.name,
        type: (item.type ?? 'Stock').replace('_', ' ') as
          | 'Stock'
          | 'ETF'
          | 'Mutual Fund'
          | 'Smallcase'
          | 'Cash',
        source: item.source,
        value: item.currentValue,
        change: Number(
          (
            ((item.currentPrice - item.avgBuyPrice) /
              Math.max(item.avgBuyPrice, 1)) *
            100
          ).toFixed(1)
        ),
      }))
    : fallbackAssets

  const resolvedLiabilities = liabilities.length > 0
    ? liabilities.map((item) => ({
        id: item.id,
        name: item.provider,
        provider: item.provider,
        outstanding: item.currentOutstanding,
        dueDate: item.dueDate,
        utilization: item.utilization ?? 0,
      }))
    : fallbackLiabilities

  const resolvedConnections =
    connections.length > 0 ? connections : mapFallbackConnections()

  // Top assets vs all
  const topAssets = useMemo(
    () =>
      [...resolvedAssets]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [resolvedAssets]
  )

  // Apply search on whichever set is active
  const baseAssetsForTable = showAllAssets ? resolvedAssets : topAssets

  const assetsForTable = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return baseAssetsForTable

    return baseAssetsForTable.filter((asset) => {
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.type.toLowerCase().includes(q) ||
        (asset.source ?? '').toLowerCase().includes(q)
      )
    })
  }, [baseAssetsForTable, searchTerm])

  const totals = useMemo(() => {
    const totalAssets = resolvedAssets.reduce(
      (sum, item) => sum + item.value,
      0
    )
    const totalLiabilities = resolvedLiabilities.reduce(
      (sum, item) => sum + item.outstanding,
      0
    )
    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    }
  }, [resolvedAssets, resolvedLiabilities])

  async function handleConnect(provider: ConnectionRecord['provider']) {
    setBusyProvider(provider)
    try {
      if (provider === 'zerodha') await launchProviderConnect('zerodha')
      if (provider === 'gmail') await launchProviderConnect('gmail')
    } finally {
      setBusyProvider(null)
    }
  }

  async function handleSync(provider: ConnectionRecord['provider']) {
    setBusyProvider(provider)
    try {
      if (provider === 'zerodha') await syncZerodha()
      if (provider === 'gmail') await syncGmailStatements()
    } finally {
      setBusyProvider(null)
    }
  }

  if (!user) {
    return <AuthPanel onLogin={login} loading={authLoading} />
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Unified wealth dashboard</p>
            <h2>
              {loading
                ? 'Loading live portfolio...'
                : 'Portfolio and liability control center'}
            </h2>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input
                placeholder="Search asset, statement, account"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
            <button className="icon-btn" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button
              className="icon-btn"
              aria-label="Sign out"
              onClick={() => void logout()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="main-grid">
          <section className="hero-panel">
            <div>
              <p className="eyebrow">Net worth</p>
              <h3>₹{totals.netWorth.toLocaleString('en-IN')}</h3>
              <p className="hero-copy">
                Signed in as {user.displayName ?? user.email}. This dashboard
                now uses Firestore-only persistence for holdings, liabilities,
                connections, and parsed statement summaries.
              </p>
            </div>
            <div className="hero-badges">
              <span>
                Assets ₹{totals.totalAssets.toLocaleString('en-IN')}
              </span>
              <span>
                Liabilities ₹{totals.totalLiabilities.toLocaleString('en-IN')}
              </span>
              <span>{resolvedConnections.length} providers tracked</span>
            </div>
          </section>

          <section className="kpi-grid">
            <KpiCard
              label="Total assets"
              value={`₹${totals.totalAssets.toLocaleString('en-IN')}`}
              delta="Live Firestore ledger"
              tone="positive"
            />
            <KpiCard
              label="Total liabilities"
              value={`₹${totals.totalLiabilities.toLocaleString('en-IN')}`}
              delta="Statement-backed dues"
              tone="warning"
            />
            <KpiCard
              label="Connected user"
              value={user.displayName ?? 'Google account'}
              delta={user.email ?? 'Authenticated'}
              tone="neutral"
            />
          </section>

          <NetworthTrend />
          <AllocationChart />

          <section className="sync-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">Connectors</p>
                <h3>Data sync center</h3>
              </div>
            </div>
            <div className="connection-grid">
              {resolvedConnections.map((connection) => (
                <ConnectionCard
                  key={connection.provider}
                  connection={connection}
                  onConnect={handleConnect}
                  onSync={handleSync}
                  busyProvider={busyProvider}
                />
              ))}
            </div>
          </section>

          <section className="top-assets-header">
            <div className="section-head">
              <div>
                <p className="eyebrow">Top assets</p>
                <h3>
                  {showAllAssets ? 'All assets' : 'Top 5 by value'}
                </h3>
              </div>
              <button
                type="button"
                className="link-btn"
                onClick={() => setShowAllAssets((prev) => !prev)}
              >
                {showAllAssets ? 'Show top 5' : 'View all'}
              </button>
            </div>
          </section>

          <AssetTable assets={assetsForTable} />
          <LiabilityList liabilities={resolvedLiabilities} />
        </main>
      </div>
    </div>
  )
}