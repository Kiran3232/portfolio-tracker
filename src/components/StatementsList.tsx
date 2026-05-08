import type { StatementRecord } from '../types/domain'

interface StatementsListProps {
  statements: StatementRecord[]
  loading?: boolean
}

function formatCreatedAt(createdAt?: unknown) {
  if (!createdAt) return 'Unknown date'

  if (
    typeof createdAt === 'object' &&
    createdAt !== null &&
    'toDate' in createdAt &&
    typeof (createdAt as { toDate: () => Date }).toDate === 'function'
  ) {
    return (createdAt as { toDate: () => Date }).toDate().toLocaleDateString('en-IN')
  }

  if (typeof createdAt === 'string') {
    const parsed = new Date(createdAt)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-IN')
    }
  }

  return 'Unknown date'
}

export function StatementsList({
  statements,
  loading = false,
}: StatementsListProps) {
  return (
    <div className="table-card compact">
      <div className="section-head">
        <div>
          <p className="eyebrow">Statements</p>
          <h3>Gmail statement feed</h3>
        </div>
        <button className="ghost-btn" type="button">
          Realtime Firestore
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading statements from Firebase...</p>
          <p className="muted">Waiting for Gmail sync results.</p>
        </div>
      ) : statements.length === 0 ? (
        <div className="empty-state">
          <p>No statements found.</p>
          <p className="muted">
            Connect Gmail and run a sync to index statement emails here.
          </p>
        </div>
      ) : (
        <div className="liability-list">
          {statements.slice(0, 8).map((statement) => (
            <article key={statement.id} className="liability-item">
              <div>
                <strong>{statement.provider}</strong>
                <p>{statement.subject ?? statement.attachmentName ?? 'Statement email'}</p>
              </div>
              <div>
                <strong>
                  {statement.statementSummary?.totalDue != null
                    ? `₹${statement.statementSummary.totalDue.toLocaleString('en-IN')}`
                    : 'Due unavailable'}
                </strong>
                <p>
                  {statement.statementSummary?.dueDate
                    ? `Due ${statement.statementSummary.dueDate}`
                    : formatCreatedAt(statement.createdAt)}
                </p>
              </div>
              <div className="utilization">
                <span>{statement.parsed ? 'Parsed' : 'Indexed'}</span>
                <div className="meter">
                  <div style={{ width: statement.parsed ? '100%' : '55%' }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
