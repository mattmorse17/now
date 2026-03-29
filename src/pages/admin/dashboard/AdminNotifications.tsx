import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { supabase } from '@/lib/supabase'
import { generatePersonalizedNotification } from '@/lib/openclaw'
import { sendPushNotification } from '@/lib/firebase'
import { Button, Input, TextArea, Card, Badge, EmptyState, Modal, Avatar } from '@/components/ui'
import { Bell, Send, Eye, Loader2, RefreshCw, Check } from 'lucide-react'

interface NotificationPreview {
  userId: string
  name: string
  message: string
  approved: boolean
}

export function AdminNotifications() {
  const { currentOrg, user } = useAuthStore()
  const { members, notifications, fetchMembers, fetchNotifications } = useOrgStore()
  const [showCompose, setShowCompose] = useState(false)
  const [context, setContext] = useState('')
  const [previews, setPreviews] = useState<NotificationPreview[]>([])
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (currentOrg) {
      fetchMembers(currentOrg.id)
      fetchNotifications(currentOrg.id)
    }
  }, [currentOrg?.id])

  const generatePreviews = async () => {
    if (!currentOrg) return
    setGenerating(true)
    const results: NotificationPreview[] = []

    for (const m of members.filter(m => m.role === 'member')) {
      if (m.agent_id) {
        try {
          const message = await generatePersonalizedNotification(m.agent_id, {
            userId: m.user_id,
            contentSummary: context,
            triggerType: 'manual',
          })
          results.push({ userId: m.user_id, name: m.users?.full_name || 'Member', message, approved: true })
        } catch {
          results.push({ userId: m.user_id, name: m.users?.full_name || 'Member', message: '(Generation failed)', approved: false })
        }
      }
    }

    setPreviews(results)
    setGenerating(false)
  }

  const sendAll = async () => {
    if (!currentOrg) return
    setSending(true)

    for (const preview of previews.filter(p => p.approved)) {
      // Save to DB
      await supabase.from('notifications').insert({
        org_id: currentOrg.id,
        user_id: preview.userId,
        message: preview.message,
        title: currentOrg.name,
        trigger_type: 'manual',
        preview_approved: true,
        sent_at: new Date().toISOString(),
      })

      // Get FCM token and send push
      const { data: userData } = await supabase.from('users').select('fcm_token').eq('id', preview.userId).single()
      if (userData?.fcm_token) {
        sendPushNotification({
          token: userData.fcm_token,
          title: currentOrg.name,
          body: preview.message,
          data: { org_id: currentOrg.id },
        }).catch(() => {})
      }

      // Zapier webhook
      if (currentOrg.zapier_webhook_url) {
        fetch(currentOrg.zapier_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'notification_sent', user_id: preview.userId, message: preview.message }),
        }).catch(() => {})
      }
    }

    setSending(false)
    setSent(true)
    fetchNotifications(currentOrg.id)
    setTimeout(() => { setShowCompose(false); setSent(false); setPreviews([]) }, 2000)
  }

  return (
    <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-medium">Notifications</h1>
          <p className="text-body text-now-text-secondary">Personalized for every member</p>
        </div>
        <Button size="sm" onClick={() => setShowCompose(true)}>
          <Send size={14} /> Compose
        </Button>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={20} />}
          title="No notifications sent"
          description="Each member gets a unique, personalized message. You preview before sending."
          action={<Button size="sm" onClick={() => setShowCompose(true)}>Send your first</Button>}
        />
      ) : (
        <div className="space-y-2">
          {notifications.slice(0, 20).map(n => (
            <Card key={n.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-caption text-now-text-secondary">
                  {new Date(n.created_at).toLocaleDateString()}
                </p>
                <Badge variant={n.opened_at ? 'success' : 'default'}>
                  {n.opened_at ? 'Opened' : 'Sent'}
                </Badge>
              </div>
              <p className="text-body">{n.message}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Compose modal */}
      <Modal open={showCompose} onClose={() => setShowCompose(false)}>
        {sent ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-now-success/10 mx-auto mb-4 flex items-center justify-center">
              <Check size={28} className="text-now-success" />
            </div>
            <p className="text-title font-medium">Sent to {previews.filter(p => p.approved).length} members</p>
          </div>
        ) : previews.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title font-medium">Preview & approve</h2>
              <button onClick={() => setPreviews([])} className="text-caption text-now-text-secondary hover:text-white">
                <RefreshCw size={14} />
              </button>
            </div>
            <p className="text-caption text-now-text-secondary mb-4">
              Each message is unique. Toggle off any you don't want to send.
            </p>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {previews.map(p => (
                <div key={p.userId} className={`p-3 rounded-xl border transition-all ${p.approved ? 'border-now-border' : 'border-now-border opacity-40'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-caption font-medium">{p.name}</p>
                    <button
                      onClick={() => setPreviews(previews.map(x => x.userId === p.userId ? { ...x, approved: !x.approved } : x))}
                      className={`w-8 h-5 rounded-full transition-colors ${p.approved ? 'bg-now-success' : 'bg-now-border'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${p.approved ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <p className="text-caption text-now-text-secondary">{p.message}</p>
                </div>
              ))}
            </div>
            <Button size="lg" onClick={sendAll} loading={sending} className="mt-4">
              Send to {previews.filter(p => p.approved).length} members
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="text-title font-medium mb-2">Compose notification</h2>
            <p className="text-caption text-now-text-secondary mb-6">
              Describe what happened. The AI writes a unique message for each member.
            </p>
            <TextArea
              label="Context"
              placeholder="e.g. We just finished a powerful session on dealing with anxiety. Key takeaway was the 5-4-3-2-1 grounding technique."
              value={context}
              onChange={e => setContext(e.target.value)}
            />
            <Button size="lg" onClick={generatePreviews} loading={generating} className="mt-4" disabled={!context.trim()}>
              <Eye size={16} /> Generate & preview
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
