import { AnimatedNumber } from './AnimatedNumber'
import { formatMoney, type SupportedCurrency } from '../utils/currency'

interface KpiCardProps {
  label: string
  value?: string
  valueNumber?: number
  currency?: SupportedCurrency
  delta: string
  tone?: 'positive' | 'warning' | 'neutral'
}

export function KpiCard({
  label,
  value,
  valueNumber,
  currency = 'INR',
  delta,
  tone = 'neutral',
}: KpiCardProps) {
  return (
    <article className={`kpi-card tone-${tone}`}>
      <div>
        <p>{label}</p>
        <strong>
          {typeof valueNumber === 'number' ? (
            <AnimatedNumber
              value={valueNumber}
              format={(v) => formatMoney(v, currency)}
            />
          ) : (
            value
          )}
        </strong>
      </div>
      <span>{delta}</span>
    </article>
  )
}
