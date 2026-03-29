import type { AgentStreamChunk } from '@/types'

const API_URL = import.meta.env.VITE_OPENCLAW_API_URL || 'http://localhost:18789'
const API_KEY = import.meta.env.VITE_OPENCLAW_API_KEY || ''

interface CreateAgentParams {
  orgId: string
  userId: string
  memberProfile: Record<string, unknown>
  globalProfile: Record<string, unknown>
  orgName: string
  orgType: string
}

interface ChatParams {
  agentId: string
  message: string
  userId: string
  orgId: string
}

const AGENT_SYSTEM_PROMPT = `You are a personal AI agent for a member of {orgName} ({orgType}).
You have deep knowledge of all content uploaded by the admin.
You know this specific member personally through their profile.

RULES:
- Reference at least ONE specific detail from this user's profile by name
- Reference at least ONE specific detail from the content/session
- Do NOT use: "great question", "certainly", "absolutely", "it's important to", "as an AI", "I'd be happy to", "here are some tips"
- Write like you know this person personally — because you do
- If you cannot make this genuinely specific, ask a clarifying question instead
- Maximum specificity: name their goal, their challenge, their role, their situation
- Minimum length that serves them: sometimes 1 sentence is better than 5`

export async function createAgent(params: CreateAgentParams): Promise<string> {
  const res = await fetch(`${API_URL}/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      name: `${params.orgName} - Agent for ${params.userId}`,
      system_prompt: AGENT_SYSTEM_PROMPT
        .replace('{orgName}', params.orgName)
        .replace('{orgType}', params.orgType),
      metadata: {
        org_id: params.orgId,
        user_id: params.userId,
        member_profile: params.memberProfile,
        global_profile: params.globalProfile,
      },
    }),
  })
  const data = await res.json()
  return data.agent_id || data.id
}

export async function ingestContent(agentId: string, content: {
  type: string
  title: string
  source_url?: string
  text?: string
  file_url?: string
}) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify(content),
  })
  return res.json()
}

export async function* streamChat(params: ChatParams): AsyncGenerator<AgentStreamChunk> {
  const res = await fetch(`${API_URL}/api/agents/${params.agentId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      message: params.message,
      stream: true,
      metadata: { user_id: params.userId, org_id: params.orgId },
    }),
  })

  if (!res.ok) {
    yield { type: 'error', content: `Agent error: ${res.statusText}` }
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    yield { type: 'error', content: 'No response stream' }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let totalTokens = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const payload = trimmed.slice(6)

      if (payload === '[DONE]') {
        yield { type: 'done', content: '', token_count: totalTokens }
        return
      }

      try {
        const parsed = JSON.parse(payload)
        const text = parsed.choices?.[0]?.delta?.content || parsed.content || parsed.text || ''
        if (text) {
          totalTokens += Math.ceil(text.length / 4)
          yield { type: 'text', content: text }
        }
      } catch {
        if (payload.length > 0 && payload !== '[DONE]') {
          yield { type: 'text', content: payload }
        }
      }
    }
  }

  yield { type: 'done', content: '', token_count: totalTokens }
}

export async function updateAgentContext(agentId: string, context: {
  member_profile?: Record<string, unknown>
  session_transcript?: string
  new_content?: string
}) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/context`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify(context),
  })
  return res.json()
}

export async function generatePersonalizedNotification(agentId: string, params: {
  userId: string
  sessionSummary?: string
  contentSummary?: string
  triggerType: string
}): Promise<string> {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      task: 'notification',
      prompt: `Generate a personalized push notification for this specific member.
               Context: ${params.triggerType}.
               ${params.sessionSummary ? `Session: ${params.sessionSummary}` : ''}
               ${params.contentSummary ? `Content: ${params.contentSummary}` : ''}
               Make it personal. Use their name. Reference something specific to them.
               Keep it under 150 characters. No generic messages.`,
      metadata: { user_id: params.userId },
    }),
  })
  const data = await res.json()
  return data.text || data.content || data.message || ''
}
