import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth'
import { Button, Avatar, Card } from '@/components/ui'
import { Plus, ChevronRight } from 'lucide-react'

export function OrgSelectPage() {
  const { orgs, setCurrentOrg, user } = useAuthStore()
  const navigate = useNavigate()

  const handleSelect = (orgId: string, role: string) => {
    setCurrentOrg(orgId)
    navigate(role === 'admin' ? '/admin' : '/home')
  }

  return (
    <div className="min-h-screen bg-now-bg flex flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-heading font-medium">Your spaces</h1>
          <p className="text-body text-now-text-secondary mt-1">
            {orgs.length > 0 ? 'Choose where to go' : 'Get started by creating or joining a space'}
          </p>
        </div>

        <div className="space-y-3">
          {orgs.map(({ org_id, role, orgs: org }) => (
            <Card
              key={org_id}
              onClick={() => handleSelect(org_id, role)}
              className="flex items-center gap-4 cursor-pointer group"
            >
              {org.logo_url ? (
                <img src={org.logo_url} alt="" className="w-11 h-11 rounded-xl object-cover" />
              ) : (
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-body font-bold"
                  style={{ backgroundColor: org.primary_color || '#fff', color: '#000' }}
                >
                  {org.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium truncate">{org.name}</p>
                <p className="text-caption text-now-text-secondary capitalize">{role}</p>
              </div>
              <ChevronRight size={18} className="text-now-text-tertiary group-hover:text-white transition-colors" />
            </Card>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <Button variant="primary" size="lg" onClick={() => navigate('/admin/onboarding')}>
            <Plus size={18} />
            Create a space
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/join')}>
            Join a space
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
