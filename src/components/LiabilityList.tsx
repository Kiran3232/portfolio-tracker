import type { LiabilityItem } from '../data/mockData'

export function LiabilityList({ liabilities }: { liabilities: LiabilityItem[] }) {
  return (
    <div className="table-card compact">
      <div className="section-head">
        <div>
          <p className="eyebrow">Credit</p>
          <h3>Upcoming dues</h3>
        </div>
        <button className="ghost-btn">Open inbox</button>
      </div>
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
              <div className="meter"><div style={{ width: `${item.utilization}%` }} /></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
