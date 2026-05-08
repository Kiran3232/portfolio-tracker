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

  if (
    typeof lastSyncAt === 'object' &&
    lastSyncAt !== null &&
    'toDate' in lastSyncAt
  ) {
    date = (lastSyncAt as { toDate: () => Date }).toDate()
  } else {
    date = new Date(lastSyncAt as string)
  }

  if (Number.isNaN(date.getTime())) {
    return String(lastSyncAt)
  }

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return 'Synced just now'
  if (diffMin < 60) return `Synced ${diffMin} min ago`
  if (diffHours < 24) return `Synced ${diffHours} hr ago`
  return `Synced ${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

function getStatusClass(status?: ConnectionRecord['status']) {
  switch (status) {
    case 'connected':
      return 'status connected'
    case 'syncing':
      return 'status syncing'
    case 'manual':
      return 'status manual'
    case 'error':
      return 'status manual'
    default:
      return 'status manual'
  }
}

function getStatusLabel(status?: ConnectionRecord['status']) {
  switch (status) {
    case 'connected':
      return 'connected'
    case 'syncing':
      return 'syncing'
    case 'manual':
      return 'manual'
    case 'error':
      return 'error'
    default:
      return 'disconnected'
  }
}

export function ConnectionCard({
  connection,
  onConnect,
  onSync,
  busyProvider,
}: ConnectionCardProps) {
  const isBusy = busyProvider === connection.provider
  const canSync = connection.status === 'connected'
  const description =
    (connection.metadata?.description as string) ??
    `Provider: ${connection.provider}`

  return (
    <article className="connection-card">
      <div className="connection-row">
        <div>
          <strong>{connection.accountLabel ?? connection.provider}</strong>
          <p>{description}</p>
        </div>
        <span className={getStatusClass(connection.status)}>
          {getStatusLabel(connection.status)}
        </span>
      </div>

      <p>{formatLastSync(connection.lastSyncAt)}</p>

      <div className="connection-footer">
        <button
          type="button"
          className="ghost-btn"
          onClick={() => onConnect(connection.provider)}
          disabled={isBusy}
        >
          {connection.status === 'connected' ? 'Reconnect' : 'Connect'}
        </button>

        <button
          type="button"
          className="ghost-btn"
          onClick={() => onSync(connection.provider)}
          disabled={!canSync || isBusy}
        >
          {isBusy ? 'Syncing...' : 'Sync now'}
        </button>
      </div>
    </article>
  )
}