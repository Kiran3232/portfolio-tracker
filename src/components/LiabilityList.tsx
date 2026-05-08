import type { LiabilityItem } from '../data/mockData'

interface LiabilityListProps {
  liabilities: LiabilityItem[]
  loading?: boolean
}

export function LiabilityList({
  liabilities,
  loading = false,
}: LiabilityListProps) {
  return (
    <div className="table-card compact">
      <div className="section-head">
        <div>
          <p className="eyebrow">Credit</p>
          <h3>Upcoming dues</h3>
        </div>
        <button className="ghost-btn" type="button">
          Open inbox
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading liabilities from Firebase...</p>
          <p className="muted">Waiting for synced statement and dues data.</p>
        </div>
      ) : liabilities.length === 0 ? (
        <div className="empty-state">
          <p>No liabilities found.</p>
          <p className="muted">
            Connect Gmail or sync statement sources to load dues.
          </p>
        </div>
      ) : (
        <div className="liability-list">
          {liabilities.map((item) => (
            <article key={item.id} className="liability-item">
              <div>
                <strong>{item.name}</strong>
                <p>{item.provider}</p>
              </div>
              <div>
                <strong>₹{item.outstanding.toLocaleString('en-IN')}</strong>
                <p>Due {item.dueDate}</p>
              </div>
              <div className="utilization">
                <span>{item.utilization}% used</span>
                <div className="meter">
                  <div style={{ width: `${item.utilization}%` }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}