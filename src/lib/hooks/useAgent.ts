import { useState, useCallback, useRef } from 'react'
import { streamChat } from '@/lib/openclaw'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export function useAgent(agentId: string | null, orgId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef(false)

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('agent_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (data) {
      const history: Message[] = []
      for (const item of data) {
        history.push({
          id: `${item.id}-user`,
          role: 'user',
          content: item.message,
          timestamp: new Date(item.created_at),
        })
        if (item.response) {
          history.push({
            id: `${item.id}-agent`,
            role: 'agent',
            content: item.response,
            timestamp: new Date(item.created_at),
          })
        }
      }
      setMessages(history)
    }
  }, [userId, orgId])

  const send = useCallback(async (message: string) => {
    if (!agentId || !message.trim() || isStreaming) return

    abortRef.current = false
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    }

    const agentMsg: Message = {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMsg, agentMsg])
    setIsStreaming(true)

    let fullResponse = ''
    let tokenCount = 0

    try {
      for await (const chunk of streamChat({ agentId, message, userId, orgId })) {
        if (abortRef.current) break

        if (chunk.type === 'text') {
          fullResponse += chunk.content
          setMessages(prev =>
            prev.map(m => m.id === agentMsg.id ? { ...m, content: fullResponse } : m)
          )
        } else if (chunk.type === 'done') {
          tokenCount = chunk.token_count || 0
        } else if (chunk.type === 'error') {
          fullResponse = chunk.content
        }
      }
    } catch (err) {
      fullResponse = fullResponse || 'Connection interrupted. Try again.'
    }

    // Mark streaming complete
    setMessages(prev =>
      prev.map(m => m.id === agentMsg.id ? { ...m, content: fullResponse, isStreaming: false } : m)
    )
    setIsStreaming(false)

    // Save to DB
    await supabase.from('agent_interactions').insert({
      user_id: userId,
      org_id: orgId,
      agent_id: agentId,
      message,
      response: fullResponse,
      token_count: tokenCount,
    })

    // Update org token usage
    if (tokenCount > 0) {
      await supabase.rpc('increment_token_usage', { p_org_id: orgId, p_tokens: tokenCount })
    }
  }, [agentId, orgId, userId, isStreaming])

  const stop = useCallback(() => {
    abortRef.current = true
    setIsStreaming(false)
  }, [])

  return { messages, isStreaming, send, stop, loadHistory }
}
