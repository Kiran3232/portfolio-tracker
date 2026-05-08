// src/components/AssetTable.tsx

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
}

export function AssetTable({ assets }: AssetTableProps) {
  const hasAssets = assets.length > 0

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Holdings</p>
          <h3>Portfolio</h3>
        </div>
      </div>

      {hasAssets ? (
        <div className="table-wrapper">
          <table className="asset-table">
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
                  <td>{asset.source ?? '—'}</td>
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
      ) : (
        <div className="empty-state">
          <p>No holdings to display yet.</p>
          <p className="muted">
            Connect a provider and run a sync to see your live portfolio here.
          </p>
        </div>
      )}
    </section>
  )
}