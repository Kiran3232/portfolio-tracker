// src/components/Sidebar.tsx

import {
  BarChart3,
  CreditCard,
  DatabaseZap,
  LayoutDashboard,
  Settings,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'

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

function scrollToSection(id: SidebarItemId) {
  // Expect sections with ids like: section-overview, section-assets, etc.
  const targetId = `section-${id}`
  const el = document.getElementById(targetId)

  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export function Sidebar() {
  const [activeId, setActiveId] = useState<SidebarItemId>('overview')

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo-dot" />
        <span className="sidebar__brand-text">Wealthboard</span>
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        <ul>
          {items.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activeId

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={
                    'sidebar__nav-item' +
                    (isActive ? ' sidebar__nav-item--active' : '')
                  }
                  onClick={() => {
                    setActiveId(item.id)
                    scrollToSection(item.id)
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}