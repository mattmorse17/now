import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { Button, Card, Badge, EmptyState } from '@/components/ui'
import { Radio, Plus, Clock } from 'lucide-react'

export function AdminSessions() {
  const { currentOrg, user } = useAuthStore()
  const { sessions, fetchSessions, createSession } = useOrgStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentOrg) fetchSessions(currentOrg.id)
  }, [currentOrg?.id])

  const startLiveSession = async () => {
    if (!currentOrg || !user) return
    const session = await createSession({
      org_id: currentOrg.id,
      created_by: user.id,
      type: 'live',
      title: `Live Session - ${new Date().toLocaleDateString()}`,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    navigate(`/admin/sessions/${session.id}/live`)
  }

  return (
    <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-medium">Sessions</h1>
          <p className="text-body text-now-text-secondary">{sessions.length} total</p>
        </div>
        <Button size="sm" onClick={startLiveSession}>
          <Radio size={14} /> Go live
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Radio size={20} />}
          title="No sessions yet"
          description="Go live to start a real-time session with transcription. The AI learns from every session."
          action={<Button size="sm" onClick={startLiveSession}>Start first session</Button>}
        />
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <Card
              key={s.id}
              onClick={() => s.status === 'active' ? navigate(`/admin/sessions/${s.id}/live`) : null}
              className={s.status === 'active' ? 'cursor-pointer' : ''}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-body font-medium">{s.title}</p>
                <Badge variant={s.status === 'active' ? 'live' : s.status === 'ended' ? 'default' : 'warning'}>
                  {s.status === 'active' && <span className="w-1.5 h-1.5 bg-current rounded-full mr-1 animate-pulse-live" />}
                  {s.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-micro text-now-text-tertiary">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {s.started_at ? new Date(s.started_at).toLocaleString() : 'Not started'}
                </span>
                {s.transcript && (
                  <span>{s.transcript.split(' ').length} words transcribed</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
