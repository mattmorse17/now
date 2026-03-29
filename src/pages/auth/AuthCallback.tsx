import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export function AuthCallback() {
  const navigate = useNavigate()
  const { init } = useAuthStore()

  useEffect(() => {
    init().then(() => navigate('/'))
  }, [])

  return (
    <div className="min-h-screen bg-now-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
