import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { supabase } from '@/lib/supabase'
import { Card, Badge, Avatar, EmptyState, Skeleton } from '@/components/ui'
import { Users, MessageSquare, Bell, Zap, Radio, TrendingUp, ArrowUpRight } from 'lucide-react'

interface EngagementData {
  total_members: number
  active_last_7d: number
  total_interactions: number
  notifications_sent: number
  notification_open_rate: number
  content_items: number
  live_sessions: number
}

export function AdminDashboard() {
  const { currentOrg } = useAuthStore()
  const { members, fetchMembers } = useOrgStore()
  const [engagement, setEngagement] = useState<EngagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!currentOrg) return
    Promise.all([
      supabase.rpc('get_engagement_summary', { p_org_id: currentOrg.id }).then(({ data }) => setEngagement(data)),
      fetchMembers(currentOrg.id),
    ]).finally(() => setLoading(false))
  }, [currentOrg?.id])

  if (!currentOrg) return null

  const stats = engagement ? [
    { label: 'Members', value: engagement.total_members, icon: Users },
    { label: 'Active (7d)', value: engagement.active_last_7d, icon: TrendingUp },
    { label: 'Interactions', value: engagement.total_interactions, icon: MessageSquare },
    { label: 'Open rate', value: `${engagement.notification_open_rate}%`, icon: Bell },
  ] : []

  return (
    <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-heading font-medium">Dashboard</h1>
        <p className="text-body text-now-text-secondary mt-1">
          {currentOrg.name} overview
        </p>
      </motion.div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="space-y-2">
                <div className="flex items-center justify-between">
                  <stat.icon size={16} className="text-now-text-tertiary" />
                </div>
                <p className="text-heading font-medium">{stat.value}</p>
                <p className="text-micro text-now-text-tertiary uppercase tracking-wider">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-2">
        <p className="text-caption text-now-text-secondary font-medium">Quick actions</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Go live', icon: Radio, to: '/admin/sessions/new', color: 'text-now-live' },
            { label: 'Add content', icon: Zap, to: '/admin/content/upload' },
            { label: 'Send notification', icon: Bell, to: '/admin/notifications/new' },
            { label: 'View members', icon: Users, to: '/admin/members' },
          ].map(action => (
            <Card key={action.label} onClick={() => navigate(action.to)} className="cursor-pointer group">
              <action.icon size={20} className={action.color || 'text-now-text-secondary'} />
              <p className="text-caption font-medium mt-2">{action.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent members */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-caption text-now-text-secondary font-medium">Recent members</p>
          <button onClick={() => navigate('/admin/members')} className="text-micro text-now-text-tertiary hover:text-white flex items-center gap-1">
            View all <ArrowUpRight size={12} />
          </button>
        </div>
        {members.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title="No members yet"
            description="Share your invite link to start building your community."
          />
        ) : (
          <div className="space-y-1">
            {members.slice(0, 5).map(m => (
              <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-now-surface transition-colors">
                <Avatar src={m.users?.avatar_url} name={m.users?.full_name || ''} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-body truncate">{m.users?.full_name}</p>
                  <p className="text-micro text-now-text-tertiary">{m.users?.email}</p>
                </div>
                <Badge variant={m.role === 'admin' ? 'default' : 'success'}>{m.role}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Token usage */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-caption text-now-text-secondary">AI Usage</p>
          <Badge>{currentOrg.subscription_tier}</Badge>
        </div>
        <div className="w-full h-2 bg-now-border rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${Math.min(100, (currentOrg.token_usage_current / currentOrg.token_limit) * 100)}%` }}
          />
        </div>
        <p className="text-micro text-now-text-tertiary mt-2">
          {currentOrg.token_usage_current.toLocaleString()} / {currentOrg.token_limit.toLocaleString()} tokens
        </p>
      </Card>
    </div>
  )
}
