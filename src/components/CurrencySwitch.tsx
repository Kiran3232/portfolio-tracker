import type { SupportedCurrency } from '../utils/currency'

interface CurrencySwitchProps {
  value: SupportedCurrency
  onChange: (currency: SupportedCurrency) => void
  usdInr: number
  loading?: boolean
}

export function CurrencySwitch({
  value,
  onChange,
  usdInr,
  loading = false,
}: CurrencySwitchProps) {
  return (
    <div className="currency-switch-card">
      <div>
        <p className="eyebrow">Display currency</p>
        <h3>Show all assets in one currency</h3>
        <p className="muted small">
          Using live USD/INR rate: {loading ? 'Loading...' : usdInr.toFixed(4)}
        </p>
      </div>

      <div className="currency-switch-actions">
        <button
          type="button"
          className={value === 'INR' ? 'primary-btn' : 'ghost-btn'}
          onClick={() => onChange('INR')}
        >
          INR
        </button>
        <button
          type="button"
          className={value === 'USD' ? 'primary-btn' : 'ghost-btn'}
          onClick={() => onChange('USD')}
        >
          USD
        </button>
      </div>
    </div>
  )
}