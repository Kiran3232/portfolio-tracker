import { LoaderCircle, RefreshCcw } from 'lucide-react'
import type { ConnectionRecord } from '../types/domain'

interface ConnectionActionsProps {
  connection: ConnectionRecord
  onConnect: (provider: ConnectionRecord['provider']) => Promise<void>
  onSync: (provider: ConnectionRecord['provider']) => Promise<void>
  busyProvider?: string | null
}

export function ConnectionActions({ connection, onConnect, onSync, busyProvider }: ConnectionActionsProps) {
  const isBusy = busyProvider === connection.provider
  const canConnect = connection.provider === 'zerodha' || connection.provider === 'gmail'
  const canSync = connection.provider === 'zerodha' || connection.provider === 'gmail'

  return (
    <div className="connection-actions">
      {canConnect ? (
        <button className="ghost-btn" onClick={() => void onConnect(connection.provider)} disabled={isBusy}>
          {isBusy ? <LoaderCircle size={16} className="spin" /> : 'Connect'}
        </button>
      ) : (
        <span className="hint-text">Manual setup</span>
      )}
      {canSync ? (
        <button className="icon-pill" onClick={() => void onSync(connection.provider)} disabled={isBusy} aria-label={`Sync ${connection.provider}`}>
          <RefreshCcw size={16} className={isBusy ? 'spin' : ''} />
        </button>
      ) : null}
    </div>
  )
}
