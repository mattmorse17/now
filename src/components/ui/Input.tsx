import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, useState } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-caption text-now-text-secondary">{label}</label>}
      <input ref={ref} className={`now-input ${error ? 'border-now-error/50' : ''} ${className}`} {...props} />
      {error && <p className="text-micro text-now-error">{error}</p>}
      {hint && !error && <p className="text-micro text-now-text-tertiary">{hint}</p>}
    </div>
  )
)

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-caption text-now-text-secondary">{label}</label>}
      <textarea
        ref={ref}
        className={`now-input min-h-[100px] resize-none ${error ? 'border-now-error/50' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-micro text-now-error">{error}</p>}
    </div>
  )
)

interface VoiceInputProps {
  value: string
  onChange: (value: string) => void
  isRecording: boolean
  onToggleRecording: () => void
  placeholder?: string
  label?: string
}

export function VoiceInput({ value, onChange, isRecording, onToggleRecording, placeholder, label }: VoiceInputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-caption text-now-text-secondary">{label}</label>}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="now-input min-h-[100px] pr-12 resize-none"
        />
        <button
          type="button"
          onClick={onToggleRecording}
          className={`absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-now-error animate-pulse-live'
              : 'bg-now-surface border border-now-border hover:bg-now-border/50'
          }`}
        >
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-white' : 'bg-now-error'}`} />
        </button>
      </div>
      {isRecording && (
        <p className="text-micro text-now-error animate-pulse-live">Listening...</p>
      )}
    </div>
  )
}
