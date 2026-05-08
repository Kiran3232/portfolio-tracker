import { useRef, useState } from 'react'
import type { ConnectionRecord } from '../types/domain'

interface ConnectionCardProps {
  connection: ConnectionRecord
  onConnect: (provider: ConnectionRecord['provider']) => void | Promise<void>
  onSync: (provider: ConnectionRecord['provider']) => void | Promise<void>
  onIndmoneyUpload?: (files: { holdings: File; orders: File }) => void | Promise<void>
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
      return 'status error'
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
  onIndmoneyUpload,
  busyProvider,
}: ConnectionCardProps) {
  const isBusy = busyProvider === connection.provider
  const isIndmoney = connection.provider === 'indmoney'
  const canSync = connection.status === 'connected'
  const description =
    (connection.metadata?.description as string) ??
    `Provider: ${connection.provider}`

  const [holdingsFile, setHoldingsFile] = useState<File | null>(null)
  const [ordersFile, setOrdersFile] = useState<File | null>(null)
  const holdingsRef = useRef<HTMLInputElement | null>(null)
  const ordersRef = useRef<HTMLInputElement | null>(null)

  async function handleUpload() {
    if (!holdingsFile || !ordersFile || !onIndmoneyUpload) return
    await onIndmoneyUpload({ holdings: holdingsFile, orders: ordersFile })
  }

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

      {isIndmoney ? (
        <div className="upload-section">
          <div className="file-upload-grid">
            <label className="file-upload-box">
              <span className="file-upload-label">Holdings report</span>
              <input
                ref={holdingsRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setHoldingsFile(e.target.files?.[0] ?? null)}
              />
              <span className="file-upload-name">
                {holdingsFile?.name ?? 'Choose HOLDINGS_BOOK file'}
              </span>
            </label>

            <label className="file-upload-box">
              <span className="file-upload-label">Orders report</span>
              <input
                ref={ordersRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setOrdersFile(e.target.files?.[0] ?? null)}
              />
              <span className="file-upload-name">
                {ordersFile?.name ?? 'Choose ORDER_BOOK file'}
              </span>
            </label>
          </div>

          <div className="connection-footer">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setHoldingsFile(null)
                setOrdersFile(null)
                if (holdingsRef.current) holdingsRef.current.value = ''
                if (ordersRef.current) ordersRef.current.value = ''
              }}
              disabled={isBusy}
            >
              Clear
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={() => void handleUpload()}
              disabled={!holdingsFile || !ordersFile || isBusy}
            >
              {isBusy ? 'Uploading...' : 'Upload reports'}
            </button>
          </div>
        </div>
      ) : (
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
            className="primary-btn"
            onClick={() => onSync(connection.provider)}
            disabled={!canSync || isBusy}
          >
            {isBusy ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
      )}
    </article>
  )
}