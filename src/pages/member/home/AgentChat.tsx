import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth'
import { useAgent } from '@/lib/hooks/useAgent'
import { useDeepgram } from '@/lib/hooks/useDeepgram'
import { StreamingText, Avatar } from '@/components/ui'
import { Send, Mic, Square, ArrowDown } from 'lucide-react'

export function AgentChat() {
  const { user, currentOrg, currentMembership } = useAuthStore()
  const agentId = currentMembership?.agent_id || null
  const { messages, isStreaming, send, stop, loadHistory } = useAgent(
    agentId, currentOrg?.id || '', user?.id || ''
  )
  const deepgram = useDeepgram()
  const [input, setInput] = useState('')
  const [showScroll, setShowScroll] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim() || deepgram.fullText.trim()
    if (!text) return
    if (deepgram.isRecording) deepgram.stop()
    send(text)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleVoice = () => {
    if (deepgram.isRecording) {
      deepgram.stop()
      const text = deepgram.fullText.trim()
      if (text) {
        send(text)
      }
    } else {
      setInput('')
      deepgram.start()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)]">
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        onScroll={() => {
          const el = scrollContainerRef.current
          if (el) setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 100)
        }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-now-surface border border-now-border flex items-center justify-center mb-4">
              <span className="text-title font-medium">AI</span>
            </div>
            <h2 className="text-title font-medium mb-1">Your personal agent</h2>
            <p className="text-body text-now-text-secondary max-w-xs">
              Ask anything about {currentOrg?.name}. I know your goals and your context.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'agent' && (
              <div className="w-7 h-7 rounded-lg bg-now-surface border border-now-border flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-micro font-medium">AI</span>
              </div>
            )}
            <div className={`max-w-[80%] ${
              msg.role === 'user'
                ? 'bg-white text-black rounded-2xl rounded-br-md px-4 py-2.5'
                : ''
            }`}>
              {msg.role === 'agent' ? (
                <StreamingText text={msg.content} isStreaming={msg.isStreaming} />
              ) : (
                <p className="text-body">{msg.content}</p>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom */}
      {showScroll && (
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-now-surface border border-now-border flex items-center justify-center"
        >
          <ArrowDown size={14} />
        </button>
      )}

      {/* Voice indicator */}
      {deepgram.isRecording && (
        <div className="px-5 py-2 bg-now-surface/80 border-t border-now-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-now-error rounded-full animate-pulse-live" />
            <p className="text-caption text-now-text-secondary flex-1 truncate">
              {deepgram.fullText || 'Listening...'}
            </p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-now-border bg-now-bg safe-bottom">
        <div className="flex items-end gap-2 max-w-lg mx-auto">
          <div className="flex-1 relative">
            <textarea
              value={deepgram.isRecording ? deepgram.fullText : input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={deepgram.isRecording ? 'Listening...' : 'Message your agent...'}
              rows={1}
              className="now-input pr-10 min-h-[44px] max-h-[120px] resize-none py-2.5"
              disabled={deepgram.isRecording}
            />
          </div>

          {/* Voice button */}
          <button
            onClick={toggleVoice}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              deepgram.isRecording
                ? 'bg-now-error text-white'
                : 'bg-now-surface border border-now-border text-now-text-secondary hover:text-white'
            }`}
          >
            {deepgram.isRecording ? <Square size={16} /> : <Mic size={18} />}
          </button>

          {/* Send button */}
          <button
            onClick={isStreaming ? stop : handleSend}
            disabled={!isStreaming && !input.trim() && !deepgram.fullText.trim()}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              isStreaming
                ? 'bg-now-error text-white'
                : 'bg-white text-black disabled:opacity-20'
            }`}
          >
            {isStreaming ? <Square size={14} /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
