import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface AllocationAsset {
  id: string
  type: string
  value: number
}

interface AllocationChartProps {
  assets: AllocationAsset[]
}

interface NetworthTrendProps {
  totalAssets: number
  totalLiabilities: number
}

const colors = ['#01696f', '#4f98a3', '#6daa45', '#d19900', '#7a39bb']

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

export function AllocationChart({ assets }: AllocationChartProps) {
  const allocation = useMemo(() => {
    const total = assets.reduce((sum, asset) => sum + asset.value, 0)
    if (total <= 0) return []

    const grouped = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.type || 'Other'
      acc[key] = (acc[key] ?? 0) + asset.value
      return acc
    }, {})

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
        percent: Number(((value / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.value - a.value)
  }, [assets])

  return (
    <div className="chart-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Composition</p>
          <h3>Asset allocation</h3>
        </div>
      </div>

      {allocation.length === 0 ? (
        <div className="empty-state">
          <p>No live asset allocation yet.</p>
          <p className="muted">
            Sync holdings from Firebase to render the portfolio mix.
          </p>
        </div>
      ) : (
        <>
          <div className="chart-wrap pie">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={64}
                  outerRadius={96}
                  paddingAngle={3}
                >
                  {allocation.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="legend-grid">
            {allocation.map((entry, index) => (
              <div key={entry.name} className="legend-item">
                <span
                  className="dot"
                  style={{ background: colors[index % colors.length] }}
                />
                <span>{entry.name}</span>
                <strong>{entry.percent}%</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function NetworthTrend({
  totalAssets,
  totalLiabilities,
}: NetworthTrendProps) {
  const liveSnapshot = useMemo(() => {
    const networth = totalAssets - totalLiabilities

    return [
      {
        label: 'Today',
        assets: totalAssets,
        liabilities: totalLiabilities,
        networth,
      },
    ]
  }, [totalAssets, totalLiabilities])

  return (
    <div className="chart-card wide">
      <div className="section-head">
        <div>
          <p className="eyebrow">Momentum</p>
          <h3>Live assets vs liabilities</h3>
        </div>
      </div>

      {totalAssets <= 0 && totalLiabilities <= 0 ? (
        <div className="empty-state">
          <p>No live balance snapshot yet.</p>
          <p className="muted">
            Connect providers and sync data to render current assets and dues.
          </p>
        </div>
      ) : (
        <>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveSnapshot}>
                <defs>
                  <linearGradient id="assetsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#01696f" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#01696f" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.18} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area
                  type="monotone"
                  dataKey="assets"
                  stroke="#01696f"
                  fill="url(#assetsGrad)"
                  strokeWidth={3}
                />
                <Bar dataKey="liabilities" fill="#d19900" radius={[8, 8, 0, 0]} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="legend-grid">
            <div className="legend-item">
              <span className="dot" style={{ background: '#01696f' }} />
              <span>Assets</span>
              <strong>{formatCurrency(totalAssets)}</strong>
            </div>
            <div className="legend-item">
              <span className="dot" style={{ background: '#d19900' }} />
              <span>Liabilities</span>
              <strong>{formatCurrency(totalLiabilities)}</strong>
            </div>
            <div className="legend-item">
              <span className="dot" style={{ background: '#6daa45' }} />
              <span>Net worth</span>
              <strong>{formatCurrency(totalAssets - totalLiabilities)}</strong>
            </div>
          </div>
        </>
      )}
    </div>
  )
}