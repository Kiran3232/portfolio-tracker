import {
  BarChart3,
  CreditCard,
  DatabaseZap,
  LayoutDashboard,
  Settings,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'

type SidebarItemId =
  | 'overview'
  | 'assets'
  | 'liabilities'
  | 'sync'
  | 'analytics'
  | 'settings'

interface SidebarItem {
  id: SidebarItemId
  label: string
  icon: React.ComponentType<{ size?: number }>
}

const items: SidebarItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'assets', label: 'Assets', icon: Wallet },
  { id: 'liabilities', label: 'Liabilities', icon: CreditCard },
  { id: 'sync', label: 'Sync Center', icon: DatabaseZap },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function getTargetId(id: SidebarItemId) {
  switch (id) {
    case 'overview':
      return 'section-overview'
    case 'assets':
      return 'section-assets'
    case 'liabilities':
      return 'section-liabilities'
    case 'sync':
      return 'section-sync'
    case 'analytics':
      return 'section-analytics'
    case 'settings':
      return 'section-settings'
    default:
      return 'section-overview'
  }
}

export function Sidebar() {
  const [activeId, setActiveId] = useState<SidebarItemId>('overview')

  const sidebarItems = useMemo(() => items, [])

  function handleNavigate(id: SidebarItemId) {
    setActiveId(id)

    const targetId = getTargetId(id)
    const element = document.getElementById(targetId)

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    // Fallbacks for sections not yet implemented
    if (id === 'overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    if (id === 'analytics') {
      const charts = document.querySelector('.chart-card')
      if (charts instanceof HTMLElement) {
        charts.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <LayoutDashboard />
        </div>
        <div>
          <p className="eyebrow">Personal finance OS</p>
          <h1>Wealthboard</h1>
        </div>
      </div>

      <nav className="nav" aria-label="Primary navigation">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = item.id === activeId

          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-card">
        <p className="eyebrow">Status</p>
        <p>Live sync dashboard for assets, liabilities, and statement data.</p>
      </div>
    </aside>
  )
}