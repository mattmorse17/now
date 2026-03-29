import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-white text-black hover:bg-white/90 active:bg-white/80',
      secondary: 'bg-now-surface border border-now-border text-now-text hover:bg-now-border/50',
      ghost: 'text-now-text-secondary hover:text-now-text',
      danger: 'bg-now-error/10 text-now-error border border-now-error/20 hover:bg-now-error/20',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-caption rounded-lg gap-1.5',
      md: 'px-5 py-3 text-body rounded-xl gap-2',
      lg: 'px-6 py-3.5 text-body rounded-xl gap-2 w-full',
    }

    return (
      <motion.button
        ref={ref as any}
        whileTap={{ scale: 0.98 }}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...(props as any)}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : children}
      </motion.button>
    )
  }
)
