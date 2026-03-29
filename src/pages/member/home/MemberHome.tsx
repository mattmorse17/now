import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { Card, Badge, StreamingText } from '@/components/ui'
import type { Notification, MemberProgress, Session } from '@/types'
import { MessageSquare, Bell, Radio, TrendingUp, ChevronRight } from 'lucide-react'

export function MemberHome() {
  const { user, currentOrg, currentMembership } = useAuthStore()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [progress, setProgress] = useState<MemberProgress | null>(null)
  const [activeSessions, setActiveSessions] = useState<Session[]>([])

  useEffect(() => {
    if (!user || !currentOrg) return

    supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setNotifications(data || []))

    supabase.from('member_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('org_id', currentOrg.id)
      .single()
      .then(({ data }) => setProgress(data))

    supabase.from('sessions')
      .select('*')
      .eq('org_id', currentOrg.id)
      .eq('status', 'active')
      .then(({ data }) => setActiveSessions(data || []))

    // Listen for live sessions
    const channel = supabase.channel(`sessions-${currentOrg.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `org_id=eq.${currentOrg.id}`,
      }, (payload) => {
        if (payload.new && (payload.new as Session).status === 'active') {
          setActiveSessions(prev => [...prev.filter(s => s.id !== (payload.new as Session).id), payload.new as Session])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, currentOrg?.id])

  return (
    <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-caption text-now-text-secondary">
          {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}
        </p>
        <h1 className="text-heading font-medium">{user?.full_name?.split(' ')[0]}</h1>
      </motion.div>

      {/* Live session banner */}
      {activeSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card
            onClick={() => navigate(`/home/session/${activeSessions[0].id}`)}
            className="border-now-live/30 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-now-live/10 flex items-center justify-center">
                <Radio size={18} className="text-now-live animate-pulse-live" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-body font-medium">Live now</p>
                  <Badge variant="live">LIVE</Badge>
                </div>
                <p className="text-caption text-now-text-secondary">{activeSessions[0].title}</p>
              </div>
              <ChevronRight size={18} className="text-now-text-tertiary" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Card onClick={() => navigate('/home/chat')} className="cursor-pointer group">
          <MessageSquare size={20} className="text-now-text-secondary mb-2" />
          <p className="text-body font-medium">Chat with AI</p>
          <p className="text-micro text-now-text-tertiary">Your personal agent</p>
        </Card>
        <Card onClick={() => navigate('/home/notifications')} className="cursor-pointer group">
          <Bell size={20} className="text-now-text-secondary mb-2" />
          <p className="text-body font-medium">Updates</p>
          <p className="text-micro text-now-text-tertiary">
            {notifications.filter(n => !n.opened_at).length} unread
          </p>
        </Card>
      </div>

      {/* Progress */}
      {progress && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-now-text-secondary" />
            <p className="text-caption text-now-text-secondary font-medium">Your progress</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-title font-medium">{progress.interaction_count}</p>
              <p className="text-micro text-now-text-tertiary">Conversations</p>
            </div>
            <div>
              <p className="text-title font-medium">{progress.sessions_attended}</p>
              <p className="text-micro text-now-text-tertiary">Sessions</p>
            </div>
            <div>
              <p className="text-title font-medium">{progress.profile_depth_score}%</p>
              <p className="text-micro text-now-text-tertiary">Profile depth</p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <p className="text-caption text-now-text-secondary font-medium">Recent updates</p>
          {notifications.slice(0, 3).map(n => (
            <Card key={n.id} className={`${!n.opened_at ? 'border-white/10' : ''}`}>
              <p className="text-body">{n.message}</p>
              <p className="text-micro text-now-text-tertiary mt-2">
                {new Date(n.created_at).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
