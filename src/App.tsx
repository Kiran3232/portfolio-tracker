import { Bell, LogOut, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssetTable } from './components/AssetTable'
import { AuthPanel } from './components/AuthPanel'
import { AllocationChart, NetworthTrend } from './components/Charts'
import { ConnectionCard } from './components/ConnectionCard'
import { CurrencySwitch } from './components/CurrencySwitch'
import { KpiCard } from './components/KpiCard'
import { LiabilityList } from './components/LiabilityList'
import { Sidebar } from './components/Sidebar'
import { StatementsList } from './components/StatementsList'
import { connections as fallbackConnections } from './data/mockData'
import { useAuthSession } from './hooks/useAuthSession'
import { useDashboardRealtime } from './hooks/useDashboardRealtime'
import { useFxRate } from './hooks/useFxRate'
import {
  launchProviderConnect,
  syncGmailStatements,
  syncZerodha,
  uploadIndmoneyReports,
} from './services/api'
import type { ConnectionRecord } from './types/domain'
import {
  convertCurrency,
  formatMoney,
  type SupportedCurrency,
} from './utils/currency'
import { AnimatedNumber } from './components/AnimatedNumber'

function mapFallbackConnections(): ConnectionRecord[] {
  return fallbackConnections.map((connection) => ({
    provider: connection.id as ConnectionRecord['provider'],
    status: 'disconnected',
    lastSyncAt: undefined,
    accountLabel: connection.name,
    metadata: { description: connection.description },
  }))
}

function normalizeHoldingType(
  type?: string
): 'Stock' | 'ETF' | 'Mutual Fund' | 'Smallcase' | 'Cash' {
  const normalized = String(type ?? 'stock').toLowerCase().replace(/ /g, '_')

  switch (normalized) {
    case 'stock':
      return 'Stock'
    case 'etf':
      return 'ETF'
    case 'mutual_fund':
    case 'mutual fund':
      return 'Mutual Fund'
    case 'smallcase':
      return 'Smallcase'
    case 'cash':
      return 'Cash'
    default:
      return 'Stock'
  }
}

export default function App() {
  const { user, loading: authLoading, login, logout } = useAuthSession()
  const {
    holdings,
    connections,
    liabilities,
    statements,
    loading,
    error,
    holdingsLoaded,
    liabilitiesLoaded,
    statementsLoaded,
  } = useDashboardRealtime(user?.uid)
  const { usdInr, loading: fxLoading, error: fxError } = useFxRate()

  const [busyProvider, setBusyProvider] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAllAssets, setShowAllAssets] = useState(false)
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>('INR')

  const resolvedAssets = holdings.map((item) => ({
    id: item.id,
    name: item.name,
    type: normalizeHoldingType(item.type),
    source: item.source,
    value: item.currentValue,
    currency: (item.currency || 'INR') as SupportedCurrency,
    change: Number(
      (
        ((item.currentPrice - item.avgBuyPrice) /
          Math.max(item.avgBuyPrice, 1)) *
        100
      ).toFixed(1)
    ),
  }))

  const resolvedLiabilities = liabilities.map((item) => ({
    id: item.id,
    name: item.provider,
    provider: item.provider,
    outstanding: item.currentOutstanding,
    dueDate: item.dueDate,
    utilization: item.utilization ?? 0,
    currency: (item.currency || 'INR') as SupportedCurrency,
  }))

  const resolvedConnections = useMemo(() => {
    const merged = new Map<ConnectionRecord['provider'], ConnectionRecord>()

    for (const fallback of mapFallbackConnections()) {
      merged.set(fallback.provider, fallback)
    }

    for (const live of connections) {
      const existing = merged.get(live.provider)
      merged.set(live.provider, {
        ...(existing ?? { provider: live.provider, status: 'disconnected' }),
        ...live,
        metadata: {
          ...(existing?.metadata ?? {}),
          ...(live.metadata ?? {}),
        },
      } as ConnectionRecord)
    }

    return Array.from(merged.values())
  }, [connections])

  const topAssets = useMemo(
    () => [...resolvedAssets].sort((a, b) => b.value - a.value).slice(0, 5),
    [resolvedAssets]
  )

  const baseAssetsForTable = showAllAssets ? resolvedAssets : topAssets

  const assetsForTable = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return baseAssetsForTable

    return baseAssetsForTable.filter(
      (asset) =>
        asset.name.toLowerCase().includes(q) ||
        asset.type.toLowerCase().includes(q) ||
        String(asset.source ?? '').toLowerCase().includes(q)
    )
  }, [baseAssetsForTable, searchTerm])

  const totals = useMemo(() => {
    const totalAssetsInInr = resolvedAssets.reduce(
      (sum, item) => sum + convertCurrency(item.value, item.currency, 'INR', usdInr),
      0
    )

    const totalLiabilitiesInInr = resolvedLiabilities.reduce(
      (sum, item) =>
        sum + convertCurrency(item.outstanding, item.currency, 'INR', usdInr),
      0
    )

    return {
      totalAssets: convertCurrency(totalAssetsInInr, 'INR', displayCurrency, usdInr),
      totalLiabilities: convertCurrency(
        totalLiabilitiesInInr,
        'INR',
        displayCurrency,
        usdInr
      ),
      netWorth: convertCurrency(
        totalAssetsInInr - totalLiabilitiesInInr,
        'INR',
        displayCurrency,
        usdInr
      ),
    }
  }, [resolvedAssets, resolvedLiabilities, displayCurrency, usdInr])

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

  async function handleIndmoneyUpload({
    holdings: holdingsFile,
    orders: ordersFile,
  }: {
    holdings: File
    orders: File
  }) {
    setBusyProvider('indmoney')
    try {
      await uploadIndmoneyReports(holdingsFile, ordersFile)
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

        {error ? (
          <div className="empty-state">
            <p>Firebase data could not be loaded.</p>
            <p className="muted">{error}</p>
          </div>
        ) : null}

        {fxError ? (
          <div className="empty-state">
            <p>Live FX rate could not be refreshed.</p>
            <p className="muted">{fxError}</p>
          </div>
        ) : null}

        <main className="main-grid">
          <section id="section-overview" className="hero-panel">
            <div>
              <p className="eyebrow">Net worth</p>
              <h3>
                <AnimatedNumber
                  value={totals.netWorth}
                  format={(v) => formatMoney(v, displayCurrency)}
                />
              </h3>
              <p className="hero-copy">
                Signed in as {user.displayName ?? user.email}. Native asset
                currency is preserved, while totals and table values can be
                switched between INR and USD.
              </p>
            </div>

            <div className="hero-badges">
              <span>Assets {formatMoney(totals.totalAssets, displayCurrency)}</span>
              <span>
                Liabilities {formatMoney(totals.totalLiabilities, displayCurrency)}
              </span>
              <span>{resolvedConnections.length} providers tracked</span>
              <span>{statements.length} statements indexed</span>
            </div>
          </section>

          <CurrencySwitch
            value={displayCurrency}
            onChange={setDisplayCurrency}
            usdInr={usdInr}
            loading={fxLoading}
          />

          <section className="kpi-grid">
            <KpiCard
              label="Total assets"
              valueNumber={totals.totalAssets}
              currency={displayCurrency}
              delta={holdingsLoaded ? `Displayed in ${displayCurrency}` : 'Loading...'}
              tone="positive"
            />
            <KpiCard
              label="Total liabilities"
              valueNumber={totals.totalLiabilities}
              currency={displayCurrency}
              delta={liabilitiesLoaded ? `Displayed in ${displayCurrency}` : 'Loading...'}
              tone="warning"
            />
            <KpiCard
              label="Statements"
              valueNumber={statements.length}
              currency={displayCurrency}
              delta={statementsLoaded ? 'Realtime Gmail index' : 'Loading...'}
              tone="neutral"
            />
          </section>

          <section id="section-analytics" className="analytics-grid">
            <NetworthTrend
              totalAssets={totals.totalAssets}
              totalLiabilities={totals.totalLiabilities}
            />
            <AllocationChart assets={resolvedAssets} />
          </section>

          <section id="section-sync" className="sync-section">
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
                  onIndmoneyUpload={handleIndmoneyUpload}
                  busyProvider={busyProvider}
                />
              ))}
            </div>
          </section>

          <section id="section-assets" className="table-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Assets</p>
                <h3>{showAllAssets ? 'All assets' : 'Top 5 by value'}</h3>
              </div>

              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowAllAssets((prev) => !prev)}
              >
                {showAllAssets ? 'Show top 5' : 'View all'}
              </button>
            </div>

            <AssetTable
              assets={assetsForTable}
              loading={!holdingsLoaded}
              displayCurrency={displayCurrency}
              usdInrRate={usdInr}
            />
          </section>

          <section id="section-statements">
            <StatementsList
              statements={statements}
              loading={!statementsLoaded}
            />
          </section>

          <section id="section-liabilities">
            <LiabilityList
              liabilities={resolvedLiabilities}
              loading={!liabilitiesLoaded}
            />
          </section>
        </main>
      </div>
    </div>
  )
}