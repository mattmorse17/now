import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth'
import { Button, Input } from '@/components/ui'

export function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signUp, loading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await signUp(email, password, fullName)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-now-bg flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-now-success/10 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-now-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-heading font-medium mb-2">Check your email</h1>
          <p className="text-body text-now-text-secondary">
            We sent a confirmation link to <span className="text-white">{email}</span>
          </p>
          <Link to="/auth/login" className="inline-block mt-8 text-caption text-now-text-secondary hover:text-white transition-colors">
            Back to sign in
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-now-bg flex flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-12">
          <div className="w-12 h-12 rounded-2xl bg-white mx-auto mb-4 flex items-center justify-center">
            <span className="text-black font-bold text-title">N</span>
          </div>
          <h1 className="text-heading font-medium">Create account</h1>
          <p className="text-body text-now-text-secondary mt-1">Start building with Now</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />

          {error && <p className="text-caption text-now-error text-center">{error}</p>}

          <Button type="submit" size="lg" loading={loading}>Create account</Button>
        </form>

        <p className="text-center text-caption text-now-text-secondary mt-8">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-white hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
