import { Area, AreaChart, Bar, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { allocation, monthlyTrend } from '../data/mockData'

const colors = ['#01696f', '#4f98a3', '#6daa45', '#d19900', '#7a39bb']

export function AllocationChart() {
  return (
    <div className="chart-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Composition</p>
          <h3>Asset allocation</h3>
        </div>
      </div>
      <div className="chart-wrap pie">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={3}>
              {allocation.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend-grid">
        {allocation.map((entry, index) => (
          <div key={entry.name} className="legend-item">
            <span className="dot" style={{ background: colors[index % colors.length] }} />
            <span>{entry.name}</span>
            <strong>{entry.value}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NetworthTrend() {
  return (
    <div className="chart-card wide">
      <div className="section-head">
        <div>
          <p className="eyebrow">Momentum</p>
          <h3>Assets vs liabilities</h3>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyTrend}>
            <defs>
              <linearGradient id="assetsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#01696f" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#01696f" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="assets" stroke="#01696f" fill="url(#assetsGrad)" strokeWidth={3} />
            <Bar dataKey="liabilities" fill="#d19900" radius={[8, 8, 0, 0]} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
