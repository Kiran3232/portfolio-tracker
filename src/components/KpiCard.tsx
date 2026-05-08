interface KpiCardProps {
  label: string
  value: string
  delta: string
  tone?: 'positive' | 'neutral' | 'warning'
}

export function KpiCard({ label, value, delta, tone = 'neutral' }: KpiCardProps) {
  return (
    <article className="kpi-card">
      <p className="eyebrow">{label}</p>
      <h2>{value}</h2>
      <span className={`delta ${tone}`}>{delta}</span>
    </article>
  )
}
