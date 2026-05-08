// src/components/ConnectionCard.tsx

import type { ConnectionRecord } from '../types/domain'

interface ConnectionCardProps {
  connection: ConnectionRecord
  onConnect: (provider: ConnectionRecord['provider']) => void
  onSync: (provider: ConnectionRecord['provider']) => void
  busyProvider: string | null
}

function formatLastSync(lastSyncAt?: unknown): string {
  if (!lastSyncAt) return 'Never synced'

  let date: Date

  // Firestore Timestamp
  if (typeof lastSyncAt === 'object' && lastSyncAt !== null && 'toDate' in lastSyncAt) {
    // @ts-expect-error – runtime check above
    date = lastSyncAt.toDate()
  } else {
    date = new Date(lastSyncAt as any)
  }

  if (Number.isNaN(date.getTime())) return 'Last sync unknown'

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return 'Synced just now'
  if (diffMin < 60) return `Synced ${diffMin} min ago`
  if (diffHours < 24) return `Synced ${diffHours} hr ago`
  return `Synced ${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

function getStatusLabel(status?: ConnectionRecord['status']) {
  if (!status) return 'Not connected'
  if (status === 'connected') return 'Connected'
  if (status === 'error') return 'Error'
  return status
}

function getStatusClass(status?: ConnectionRecord['status']) {
  if (status === 'connected') return 'status-pill status-pill--ok'
  if (status === 'error') return 'status-pill status-pill--error'
  if (status === 'syncing') return 'status-pill status-pill--sync'
  return 'status-pill status-pill--idle'
}

export function ConnectionCard({
  connection,
  onConnect,
  onSync,
  busyProvider,
}: ConnectionCardProps) {
  const isBusy = busyProvider === connection.provider
  const statusLabel = getStatusLabel(connection.status)
  const statusClass = getStatusClass(connection.status)

  const canSync = connection.status === 'connected'

  return (
    <article className="connection-card">
      <header className="connection-card__header">
        <div>
          <h4 className="connection-card__title">
            {connection.accountLabel ?? connection.provider}
          </h4>
          <p className="connection-card__subtitle">
            {(connection.metadata?.description as string) ??
              `Provider: ${connection.provider}`}
          </p>
        </div>
        <span className={statusClass}>{statusLabel}</span>
      </header>

      <div className="connection-card__meta">
        <p className="connection-card__last-sync">
          {formatLastSync(connection.lastSyncAt)}
        </p>
      </div>

      <div className="connection-card__actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onConnect(connection.provider)}
          disabled={isBusy}
        >
          {connection.status === 'connected' ? 'Reconnect' : 'Connect'}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onSync(connection.provider)}
          disabled={!canSync || isBusy}
        >
          {isBusy && connection.provider === busyProvider
            ? 'Syncing...'
            : 'Sync now'}
        </button>
      </div>
    </article>
  )
}