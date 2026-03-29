const DEEPGRAM_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY || ''

export interface TranscriptEvent {
  text: string
  is_final: boolean
  confidence: number
  words: { word: string; start: number; end: number }[]
}

export class DeepgramLiveTranscriber {
  private socket: WebSocket | null = null
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private onTranscript: (event: TranscriptEvent) => void
  private onError: (error: string) => void
  private onClose: () => void

  constructor(handlers: {
    onTranscript: (event: TranscriptEvent) => void
    onError: (error: string) => void
    onClose: () => void
  }) {
    this.onTranscript = handlers.onTranscript
    this.onError = handlers.onError
    this.onClose = handlers.onClose
  }

  async start(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      })

      const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&interim_results=true&smart_format=true&filler_words=false&language=en-US`

      this.socket = new WebSocket(wsUrl, ['token', DEEPGRAM_KEY])

      this.socket.onopen = () => {
        this.mediaRecorder = new MediaRecorder(this.mediaStream!, { mimeType: 'audio/webm;codecs=opus' })
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(e.data)
          }
        }
        this.mediaRecorder.start(250)
      }

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
            const alt = data.channel.alternatives[0]
            this.onTranscript({
              text: alt.transcript || '',
              is_final: data.is_final || false,
              confidence: alt.confidence || 0,
              words: alt.words || [],
            })
          }
        } catch {
          // ignore parse errors
        }
      }

      this.socket.onerror = () => this.onError('Transcription connection failed')
      this.socket.onclose = () => this.onClose()
    } catch (err) {
      this.onError(err instanceof Error ? err.message : 'Microphone access denied')
    }
  }

  stop(): void {
    this.mediaRecorder?.stop()
    this.mediaStream?.getTracks().forEach(t => t.stop())
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'CloseStream' }))
      this.socket.close()
    }
    this.socket = null
    this.mediaStream = null
    this.mediaRecorder = null
  }

  get isActive(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }
}

export async function transcribeFile(audioUrl: string): Promise<string> {
  const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: audioUrl }),
  })
  const data = await res.json()
  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
}
