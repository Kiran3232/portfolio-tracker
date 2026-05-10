import { useMemo, useState } from 'react'
import type { StatementRecord } from '../types/domain'
import { markStatementPaid, markStatementUnpaid } from '../services/api'
import { formatMoney } from '../utils/currency'

interface StatementsListProps {
  statements: StatementRecord[]
  loading?: boolean
}

function formatDate(value?: unknown) {
  if (!value) return '—'

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString('en-IN')
  }

  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN')
}

function getCreatedAtMillis(value?: unknown) {
  if (!value) return 0

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  const timestamp = new Date(String(value)).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getStatementRank(statement: StatementRecord) {
  const totalDue = Number(statement.statementSummary?.totalDue || 0)
  const status = statement.paymentStatus || 'unpaid'

  if (totalDue <= 0) return 3
  if (status !== 'paid') return 1
  return 2
}

export function StatementsList({ statements, loading = false }: StatementsListProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const sortedStatements = useMemo(() => {
    return [...statements].sort((a, b) => {
      const rankDiff = getStatementRank(a) - getStatementRank(b)
      if (rankDiff !== 0) return rankDiff
      return getCreatedAtMillis(b.createdAt) - getCreatedAtMillis(a.createdAt)
    })
  }, [statements])

  const defaultStatements = sortedStatements.filter(
    (statement) => Number(statement.statementSummary?.totalDue || 0) > 0
  )

  const visibleStatements = showAll
    ? sortedStatements
    : defaultStatements.slice(0, 5)

  async function handleToggle(statement: StatementRecord) {
    setBusyId(statement.id)
    try {
      if (statement.paymentStatus === 'paid') {
        await markStatementUnpaid(statement.id)
      } else {
        await markStatementPaid(statement.id)
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="table-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Statements</p>
          <h3>Credit card statements</h3>
        </div>

        {sortedStatements.length > 5 ? (
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? 'Show less' : `View all (${sortedStatements.length})`}
          </button>
        ) : null}
      </div>

      <div className="statement-list">
        {loading ? (
          <p className="muted">Loading statements…</p>
        ) : visibleStatements.length === 0 ? (
          <p className="muted">No credit card statements found.</p>
        ) : (
          visibleStatements.map((statement) => {
            const totalDue = Number(statement.statementSummary?.totalDue || 0)
            const dueDate = statement.statementSummary?.dueDate || '—'
            const currency = (statement.currency || 'INR') as 'INR' | 'USD'
            const isZeroStatement = totalDue <= 0
            const status = isZeroStatement
              ? 'No payment required'
              : statement.paymentStatus || 'unpaid'

            return (
              <article key={statement.id} className="statement-card">
                <div>
                  <p className="eyebrow">{statement.provider || 'Unknown Provider'}</p>
                  <h4>{statement.subject || 'Statement email'}</h4>
                  <p className="muted small">Due: {dueDate} · Email date: {formatDate(statement.createdAt)}</p>
                  <p className="muted small">{statement.from || 'Unknown sender'}</p>
                </div>

                <div className="statement-side">
                  <strong>{formatMoney(totalDue, currency)}</strong>
                  <span className={`status ${isZeroStatement ? 'manual' : status === 'paid' ? 'connected' : status === 'partial' ? 'syncing' : 'manual'}`}>
                    {status}
                  </span>
                  {!isZeroStatement ? (
                    <button
                      type="button"
                      className={status === 'paid' ? 'ghost-btn' : 'primary-btn'}
                      disabled={busyId === statement.id}
                      onClick={() => void handleToggle(statement)}
                    >
                      {busyId === statement.id
                        ? 'Updating...'
                        : status === 'paid'
                          ? 'Mark unpaid'
                          : 'Mark paid'}
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}