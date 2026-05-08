export interface AssetRow {
  id: string
  name: string
  type: string
  source?: string
  value: number
  change: number
}

interface AssetTableProps {
  assets: AssetRow[]
  loading?: boolean
}

export function AssetTable({ assets, loading = false }: AssetTableProps) {
  if (loading) {
    return (
      <div className="table-wrapper">
        <div className="empty-state">
          <p>Loading holdings from Firebase...</p>
          <p className="muted">Please wait while your portfolio is fetched.</p>
        </div>
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="empty-state">
        <p>No holdings found.</p>
        <p className="muted">
          Connect a provider and run a sync to load portfolio data.
        </p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Instrument</th>
            <th>Type</th>
            <th>Source</th>
            <th className="numeric">Value</th>
            <th className="numeric">1D</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td>{asset.name}</td>
              <td>{asset.type}</td>
              <td>{asset.source ?? '-'}</td>
              <td className="numeric">
                ₹{asset.value.toLocaleString('en-IN')}
              </td>
              <td
                className={
                  'numeric ' +
                  (asset.change >= 0 ? 'positive-text' : 'negative-text')
                }
              >
                {asset.change >= 0 ? '+' : ''}
                {asset.change.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}