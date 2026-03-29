import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { Button, Input, TextArea, Avatar, Card } from '@/components/ui'
import { LogOut, TrendingUp, ChevronRight } from 'lucide-react'

export function MemberProfile() {
  const { user, updateUser, signOut, currentOrg, orgs, setCurrentOrg } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [bio, setBio] = useState(user?.global_profile?.bio || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await updateUser({
      full_name: fullName,
      global_profile: { ...user?.global_profile, bio } as any,
    })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-4">
        <Avatar src={user?.avatar_url} name={user?.full_name || ''} size="lg" />
        <div>
          <h1 className="text-title font-medium">{user?.full_name}</h1>
          <p className="text-caption text-now-text-secondary">{user?.email}</p>
        </div>
      </div>

      {editing ? (
        <Card className="space-y-4">
          <Input label="Name" value={fullName} onChange={e => setFullName(e.target.value)} />
          <TextArea label="Bio" value={bio} onChange={e => setBio(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </Card>
      ) : (
        <Card onClick={() => setEditing(true)} className="cursor-pointer">
          <p className="text-caption text-now-text-secondary mb-1">Bio</p>
          <p className="text-body">{user?.global_profile?.bio || 'Tap to add a bio'}</p>
        </Card>
      )}

      {user?.social_links && Object.entries(user.social_links).some(([, v]) => v) && (
        <Card>
          <p className="text-caption text-now-text-secondary mb-3">Social links</p>
          <div className="space-y-2">
            {Object.entries(user.social_links).filter(([, v]) => v).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-caption">
                <span className="text-now-text-tertiary capitalize">{key}</span>
                <span className="text-now-text-secondary">{value as string}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Own a Piece — tasteful investor CTA */}
      <a href="/invest" className="block">
        <Card className="cursor-pointer border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-now-border flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} className="text-now-text-secondary" />
            </div>
            <div className="flex-1">
              <p className="text-body font-medium">Own a piece of AI³</p>
              <p className="text-caption text-now-text-secondary">You use it every day. Want to own part of it?</p>
            </div>
            <ChevronRight size={16} className="text-now-text-tertiary" />
          </div>
        </Card>
      </a>

      {orgs.length > 1 && (
        <div className="space-y-2">
          <p className="text-caption text-now-text-secondary font-medium">Your spaces</p>
          {orgs.map(m => (
            <Card
              key={m.org_id}
              onClick={() => {
                setCurrentOrg(m.org_id)
                window.location.href = m.role === 'admin' ? '/admin' : '/home'
              }}
              className={`cursor-pointer flex items-center gap-3 ${m.org_id === currentOrg?.id ? 'border-white/20' : ''}`}
            >
              <div className="w-9 h-9 rounded-lg bg-now-surface border border-now-border flex items-center justify-center text-caption font-medium">
                {(m.orgs as any)?.name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <p className="text-body">{(m.orgs as any)?.name}</p>
                <p className="text-micro text-now-text-tertiary capitalize">{m.role}</p>
              </div>
              {m.org_id === currentOrg?.id && (
                <div className="w-2 h-2 bg-now-success rounded-full" />
              )}
            </Card>
          ))}
        </div>
      )}

      <Button variant="ghost" size="md" onClick={signOut} className="text-now-text-secondary">
        <LogOut size={16} /> Sign out
      </Button>
    </div>
  )
}
