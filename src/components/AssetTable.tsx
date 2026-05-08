import { convertCurrency, formatMoney, type SupportedCurrency } from '../utils/currency'

interface AssetRow {
  id: string
  name: string
  type: 'Stock' | 'ETF' | 'Mutual Fund' | 'Smallcase' | 'Cash'
  source?: string
  value: number
  change: number
  currency?: string
}

interface AssetTableProps {
  assets: AssetRow[]
  loading?: boolean
  displayCurrency: SupportedCurrency
  usdInrRate: number
}

export function AssetTable({
  assets,
  loading = false,
  displayCurrency,
  usdInrRate,
}: AssetTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Source</th>
            <th>Value</th>
            <th>Native</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="muted">
                Loading assets...
              </td>
            </tr>
          ) : assets.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">
                No assets found.
              </td>
            </tr>
          ) : (
            assets.map((asset) => {
              const nativeCurrency = (asset.currency || 'INR') as SupportedCurrency
              const displayValue = convertCurrency(
                asset.value,
                nativeCurrency,
                displayCurrency,
                usdInrRate
              )

              return (
                <tr key={asset.id}>
                  <td>
                    <strong>{asset.name}</strong>
                  </td>
                  <td>{asset.type}</td>
                  <td>{asset.source ?? '-'}</td>
                  <td>{formatMoney(displayValue, displayCurrency)}</td>
                  <td>{formatMoney(asset.value, nativeCurrency)}</td>
                  <td className={asset.change >= 0 ? 'positive' : 'negative'}>
                    {asset.change >= 0 ? '+' : ''}
                    {asset.change.toFixed(1)}%
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}