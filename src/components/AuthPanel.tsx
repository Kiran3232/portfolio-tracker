import { ShieldCheck } from 'lucide-react'

interface AuthPanelProps {
  onLogin: () => Promise<void>
  loading: boolean
}

export function AuthPanel({ onLogin, loading }: AuthPanelProps) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark large" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 32C11 20.402 20.402 11 32 11C43.598 11 53 20.402 53 32C53 43.598 43.598 53 32 53" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
            <path d="M24 24L39 32L24 40V24Z" fill="currentColor"/>
          </svg>
        </div>
        <p className="eyebrow">Private wealth dashboard</p>
        <h1>Connect your portfolio stack and Gmail securely</h1>
        <p className="auth-copy">
          Sign in with Google, connect your providers, and stream holdings, liabilities, and statement data into your Firebase-backed ledger.
        </p>
        <button className="primary-btn" onClick={() => void onLogin()} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
        <div className="auth-note">
          <ShieldCheck size={18} />
          <span>Read-only Gmail sync and server-side broker tokens.</span>
        </div>
      </section>
    </main>
  )
}
