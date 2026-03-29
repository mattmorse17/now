import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Button, Input } from '@/components/ui'

export function JoinPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const handleJoin = async () => {
    setError('')
    setLoading(true)
    const slug = code.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

    const { data: org } = await supabase
      .from('orgs')
      .select('slug')
      .eq('slug', slug)
      .single()

    setLoading(false)

    if (!org) {
      setError('Space not found. Check the code and try again.')
      return
    }

    if (user) {
      navigate(`/join/${slug}`)
    } else {
      // Redirect to signup, then back to join
      localStorage.setItem('now_join_slug', slug)
      navigate('/auth/signup')
    }
  }

  return (
    <div className="min-h-screen bg-now-bg flex flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-12">
          <div className="w-12 h-12 rounded-2xl bg-white mx-auto mb-4 flex items-center justify-center">
            <span className="text-black font-bold text-title">N</span>
          </div>
          <h1 className="text-heading font-medium">Join a space</h1>
          <p className="text-body text-now-text-secondary mt-1">Enter the invite code from your admin</p>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Space code or slug"
            value={code}
            onChange={e => setCode(e.target.value)}
            autoFocus
          />
          {error && <p className="text-caption text-now-error text-center">{error}</p>}
          <Button size="lg" onClick={handleJoin} loading={loading} disabled={!code.trim()}>
            Join
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
