import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { Avatar } from '@/components/ui'
import { Home, MessageSquare, Bell, User, Settings, Users, BarChart3, Zap, Radio } from 'lucide-react'

export function AdminShell() {
  const { currentOrg, user } = useAuthStore()
  const location = useLocation()

  const navItems = [
    { to: '/admin', icon: BarChart3, label: 'Dashboard', end: true },
    { to: '/admin/members', icon: Users, label: 'Members' },
    { to: '/admin/content', icon: Zap, label: 'Content' },
    { to: '/admin/sessions', icon: Radio, label: 'Sessions' },
    { to: '/admin/notifications', icon: Bell, label: 'Notify' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-now-bg flex flex-col">
      {/* Top bar */}
      <header className="safe-top border-b border-now-border bg-now-bg/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-3">
            {currentOrg?.logo_url ? (
              <img src={currentOrg.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
                <span className="text-black text-micro font-bold">{currentOrg?.name?.[0] || 'N'}</span>
              </div>
            )}
            <span className="text-body font-medium">{currentOrg?.name || 'Now'}</span>
          </div>
          <Avatar src={user?.avatar_url} name={user?.full_name || ''} size="sm" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 safe-bottom border-t border-now-border bg-now-bg/80 backdrop-blur-xl z-40">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  isActive ? 'text-white' : 'text-now-text-tertiary'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.5} />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function MemberShell() {
  const { currentOrg, user } = useAuthStore()

  const navItems = [
    { to: '/home', icon: Home, label: 'Home', end: true },
    { to: '/home/chat', icon: MessageSquare, label: 'Agent' },
    { to: '/home/notifications', icon: Bell, label: 'Updates' },
    { to: '/home/profile', icon: User, label: 'Profile' },
  ]

  return (
    <div className="min-h-screen bg-now-bg flex flex-col">
      <header className="safe-top border-b border-now-border bg-now-bg/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-3">
            {currentOrg?.logo_url ? (
              <img src={currentOrg.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
                <span className="text-black text-micro font-bold">{currentOrg?.name?.[0] || 'N'}</span>
              </div>
            )}
            <span className="text-body font-medium">{currentOrg?.name || 'Now'}</span>
          </div>
          <Avatar src={user?.avatar_url} name={user?.full_name || ''} size="sm" />
        </div>
      </header>

      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 safe-bottom border-t border-now-border bg-now-bg/80 backdrop-blur-xl z-40">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  isActive ? 'text-white' : 'text-now-text-tertiary'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.5} />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
