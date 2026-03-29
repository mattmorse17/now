import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { Card, Badge, Avatar, EmptyState } from '@/components/ui'
import { Users, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export function AdminMembers() {
  const { currentOrg } = useAuthStore()
  const { members, fetchMembers } = useOrgStore()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (currentOrg) fetchMembers(currentOrg.id)
  }, [currentOrg?.id])

  const inviteLink = `${window.location.origin}/join/${currentOrg?.slug}`

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-heading font-medium">Members</h1>
        <p className="text-body text-now-text-secondary">{members.length} people</p>
      </div>

      {/* Invite link */}
      <Card className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-micro text-now-text-tertiary uppercase tracking-wider mb-1">Invite link</p>
          <p className="text-caption text-now-text-secondary truncate">{inviteLink}</p>
        </div>
        <button onClick={copyLink} className="p-2 rounded-lg hover:bg-now-border/50 transition-colors">
          {copied ? <Check size={16} className="text-now-success" /> : <Copy size={16} className="text-now-text-secondary" />}
        </button>
      </Card>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No members yet"
          description="Share your invite link. Each member gets their own personal AI."
        />
      ) : (
        <div className="space-y-1">
          {members.map(m => (
            <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-now-surface transition-colors">
              <Avatar src={m.users?.avatar_url} name={m.users?.full_name || ''} />
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium truncate">{m.users?.full_name}</p>
                <p className="text-micro text-now-text-tertiary">{m.users?.email}</p>
              </div>
              <div className="text-right">
                <Badge variant={m.role === 'admin' ? 'default' : 'success'}>{m.role}</Badge>
                <p className="text-micro text-now-text-tertiary mt-0.5">
                  {new Date(m.joined_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
