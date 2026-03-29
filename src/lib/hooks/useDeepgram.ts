import { useState, useRef, useCallback } from 'react'
import { DeepgramLiveTranscriber, type TranscriptEvent } from '@/lib/deepgram'

export function useDeepgram() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const transcriberRef = useRef<DeepgramLiveTranscriber | null>(null)

  const start = useCallback(async (onTranscript?: (event: TranscriptEvent) => void) => {
    setError(null)
    setTranscript('')
    setInterimText('')

    transcriberRef.current = new DeepgramLiveTranscriber({
      onTranscript: (event) => {
        if (event.is_final && event.text) {
          setTranscript(prev => prev + (prev ? ' ' : '') + event.text)
          setInterimText('')
        } else if (!event.is_final) {
          setInterimText(event.text)
        }
        onTranscript?.(event)
      },
      onError: (err) => setError(err),
      onClose: () => setIsRecording(false),
    })

    await transcriberRef.current.start()
    setIsRecording(true)
  }, [])

  const stop = useCallback(() => {
    transcriberRef.current?.stop()
    transcriberRef.current = null
    setIsRecording(false)
    setInterimText('')
  }, [])

  return {
    isRecording,
    transcript,
    interimText,
    fullText: transcript + (interimText ? ' ' + interimText : ''),
    error,
    start,
    stop,
  }
}
