import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { Card, EmptyState } from '@/components/ui'
import type { Notification } from '@/types'
import { Bell } from 'lucide-react'

export function MemberNotifications() {
  const { user, currentOrg } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!user || !currentOrg) return
    supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotifications(data || [])
        // Mark unread as opened
        const unread = (data || []).filter(n => !n.opened_at).map(n => n.id)
        if (unread.length > 0) {
          unread.forEach(id => supabase.rpc('mark_notification_opened', { p_notification_id: id }))
        }
      })

    // Listen for new notifications
    const channel = supabase.channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, currentOrg?.id])

  return (
    <div className="px-5 py-6 space-y-4 max-w-lg mx-auto">
      <h1 className="text-heading font-medium">Updates</h1>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={20} />}
          title="No updates yet"
          description="When your admin sends notifications, they'll appear here — personalized just for you."
        />
      ) : (
        notifications.map(n => (
          <Card key={n.id} className={!n.opened_at ? 'border-white/10' : ''}>
            {n.title && <p className="text-micro text-now-text-tertiary uppercase tracking-wider mb-1">{n.title}</p>}
            <p className="text-body">{n.message}</p>
            <p className="text-micro text-now-text-tertiary mt-2">
              {new Date(n.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </Card>
        ))
      )}
    </div>
  )
}
