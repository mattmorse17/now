import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { useDeepgram } from '@/lib/hooks/useDeepgram'
import { Button, Badge, Card } from '@/components/ui'
import type { Session } from '@/types'
import { Radio, Mic, MicOff, Square, ChevronLeft } from 'lucide-react'

export function LiveSession() {
  const { sessionId } = useParams()
  const { user, currentOrg, currentMembership } = useAuthStore()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('')
  const deepgram = useDeepgram()
  const transcriptRef = useRef<HTMLDivElement>(null)
  const isAdmin = currentMembership?.role === 'admin'

  useEffect(() => {
    if (!sessionId) return
    supabase.from('sessions').select('*').eq('id', sessionId).single()
      .then(({ data }) => {
        if (data) {
          setSession(data)
          setLiveTranscript(data.transcript || '')
        }
      })

    // Subscribe to real-time transcript updates
    const channel = supabase.channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        const updated = payload.new as Session
        setSession(updated)
        setLiveTranscript(updated.transcript || '')
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })
  }, [liveTranscript])

  const startRecording = async () => {
    await deepgram.start((event) => {
      if (event.is_final && event.text && sessionId) {
        const newText = event.text
        setLiveTranscript(prev => {
          const updated = prev + (prev ? ' ' : '') + newText
          // Persist to DB
          supabase.from('sessions')
            .update({ transcript: updated })
            .eq('id', sessionId)
            .then(() => {})
          return updated
        })
      }
    })
  }

  const endSession = async () => {
    if (!sessionId) return
    deepgram.stop()
    await supabase.from('sessions').update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      transcript: liveTranscript,
    }).eq('id', sessionId)
    navigate(isAdmin ? '/admin/sessions' : '/home')
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-now-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-now-bg flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-now-border">
        <button onClick={() => navigate(-1)} className="text-now-text-secondary">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <p className="text-body font-medium">{session.title}</p>
            {session.status === 'active' && (
              <Badge variant="live">
                <span className="w-1.5 h-1.5 bg-current rounded-full mr-1 animate-pulse-live" />
                LIVE
              </Badge>
            )}
          </div>
        </div>
        <div className="w-5" />
      </div>

      {/* Transcript */}
      <div ref={transcriptRef} className="flex-1 overflow-y-auto px-5 py-6">
        {liveTranscript ? (
          <div className="max-w-lg mx-auto">
            <p className="text-body leading-relaxed text-now-text/90 whitespace-pre-wrap">
              {liveTranscript}
            </p>
            {deepgram.interimText && (
              <span className="text-body text-now-text-tertiary">{deepgram.interimText}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Radio size={32} className="text-now-text-tertiary mb-4" />
            <p className="text-body text-now-text-secondary">
              {isAdmin ? 'Tap the mic to start transcribing' : 'Waiting for session to begin...'}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      {isAdmin && session.status === 'active' && (
        <div className="px-5 py-4 border-t border-now-border">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <button
              onClick={deepgram.isRecording ? () => deepgram.stop() : startRecording}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                deepgram.isRecording
                  ? 'bg-now-error animate-pulse-live'
                  : 'bg-white'
              }`}
            >
              {deepgram.isRecording
                ? <MicOff size={22} className="text-white" />
                : <Mic size={22} className="text-black" />}
            </button>
            <Button variant="secondary" size="md" onClick={endSession} className="flex-1">
              <Square size={14} /> End session
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
