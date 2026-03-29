export { Button } from './Button'
export { Input, TextArea, VoiceInput } from './Input'

// Card
export function Card({ children, className = '', onClick }: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div className={`now-card ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

// Badge
export function Badge({ children, variant = 'default', className = '' }: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'live'
  className?: string
}) {
  const colors = {
    default: 'bg-now-accent-dim text-now-text-secondary',
    success: 'bg-now-success/10 text-now-success',
    warning: 'bg-now-warning/10 text-now-warning',
    error: 'bg-now-error/10 text-now-error',
    live: 'bg-now-live/10 text-now-live',
  }
  return <span className={`now-badge ${colors[variant]} ${className}`}>{children}</span>
}

// Empty State
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-now-surface border border-now-border flex items-center justify-center mb-4 text-now-text-tertiary">
        {icon}
      </div>
      <h3 className="text-title font-medium text-now-text mb-1">{title}</h3>
      <p className="text-body text-now-text-secondary max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}

// Avatar
export function Avatar({ src, name, size = 'md' }: {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = { sm: 'w-8 h-8 text-micro', md: 'w-10 h-10 text-caption', lg: 'w-14 h-14 text-body' }
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover`} />
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-now-surface border border-now-border flex items-center justify-center font-medium text-now-text-secondary`}>
      {initials}
    </div>
  )
}

// Skeleton loader
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-now-surface animate-pulse rounded-lg ${className}`} />
}

// Step indicator for onboarding
export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current ? 'bg-white w-6' : i === current ? 'bg-white w-8' : 'bg-now-border w-6'
          }`}
        />
      ))}
    </div>
  )
}

// Modal
export function Modal({ open, onClose, children }: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-now-bg border border-now-border rounded-t-2xl sm:rounded-2xl p-6 safe-bottom">
        {children}
      </div>
    </div>
  )
}

// Streaming text display
export function StreamingText({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  return (
    <div className="text-body text-now-text leading-relaxed whitespace-pre-wrap">
      {text}
      {isStreaming && <span className="streaming-cursor" />}
    </div>
  )
}
