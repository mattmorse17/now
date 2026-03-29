import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        now: {
          bg: '#0A0A0A',
          surface: '#141414',
          border: '#1E1E1E',
          'border-hover': '#2A2A2A',
          text: '#FAFAFA',
          'text-secondary': '#8A8A8A',
          'text-tertiary': '#555555',
          accent: '#FFFFFF',
          'accent-dim': 'rgba(255,255,255,0.08)',
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          live: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['"SF Pro Display"', '"Satoshi"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'heading': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'title': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'body': ['0.9375rem', { lineHeight: '1.6' }],
        'caption': ['0.8125rem', { lineHeight: '1.5' }],
        'micro': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.04em' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-live': 'pulseLive 2s ease-in-out infinite',
        'stream': 'stream 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseLive: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        stream: { '0%': { opacity: '0.4' }, '50%': { opacity: '1' }, '100%': { opacity: '0.4' } },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
} satisfies Config
