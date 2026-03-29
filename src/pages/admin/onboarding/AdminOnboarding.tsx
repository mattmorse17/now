import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { Button, Input, TextArea, StepIndicator } from '@/components/ui'
import type { OrgType, CustomQuestion, MemberAccessMode, SubscriptionTier } from '@/types'
import { PRICING_TIERS } from '@/types'
import { Upload, Link as LinkIcon, Youtube, Mic, FileText, Globe, Camera, X, Plus, ChevronRight, ChevronLeft } from 'lucide-react'

const TOTAL_STEPS = 10

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
}

export function AdminOnboarding() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const navigate = useNavigate()
  const { user, refreshOrgs, setCurrentOrg } = useAuthStore()

  // Form state
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState<OrgType>('creator')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
  const [contentUrls, setContentUrls] = useState<string[]>([''])
  const [socialAccounts, setSocialAccounts] = useState({ instagram: '', youtube: '', twitter: '', website: '' })
  const [zoomConnected, setZoomConnected] = useState(false)
  const [accessMode, setAccessMode] = useState<MemberAccessMode>('free')
  const [memberPrice, setMemberPrice] = useState('')
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('starter')
  const [loading, setLoading] = useState(false)

  const next = () => { setDirection(1); setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)) }
  const prev = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)) }

  const addQuestion = () => {
    setCustomQuestions([...customQuestions, {
      id: crypto.randomUUID(),
      question: '',
      type: 'text',
      required: false,
    }])
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleFinish = async () => {
    if (!user) return
    setLoading(true)
    try {
      // Upload logo if present
      let logoUrl = ''
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `logos/${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('org-assets').upload(path, logoFile)
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('org-assets').getPublicUrl(path)
          logoUrl = publicUrl
        }
      }

      // Generate slug
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      // Create org
      const { data: org, error: orgErr } = await supabase.from('orgs').insert({
        name: orgName,
        slug,
        type: orgType,
        admin_user_id: user.id,
        logo_url: logoUrl || null,
        onboarding_config: {
          welcome_message: welcomeMessage,
          custom_questions: customQuestions.filter(q => q.question.trim()),
          require_social_links: false,
          require_voice_intro: false,
        },
        member_access_mode: accessMode,
        member_price_cents: accessMode === 'paid' ? Math.round(parseFloat(memberPrice || '0') * 100) : 0,
        subscription_tier: selectedTier,
        zapier_webhook_url: '',
      }).select().single()

      if (orgErr) throw orgErr

      // Add admin as member
      await supabase.from('org_members').insert({
        user_id: user.id,
        org_id: org.id,
        role: 'admin',
      })

      // Add initial content URLs
      for (const url of contentUrls.filter(u => u.trim())) {
        await supabase.from('content').insert({
          org_id: org.id,
          uploaded_by: user.id,
          type: 'url',
          title: url,
          source_url: url,
        })
      }

      await refreshOrgs()
      setCurrentOrg(org.id)
      navigate('/admin')
    } catch (err) {
      console.error('Onboarding error:', err)
    } finally {
      setLoading(false)
    }
  }

  const connectZoom = () => {
    const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID
    const redirectUri = import.meta.env.VITE_ZOOM_REDIRECT_URI
    if (clientId && redirectUri) {
      window.location.href = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
    }
  }

  const orgTypes: { value: OrgType; label: string; desc: string }[] = [
    { value: 'church', label: 'Church', desc: 'Congregation & small groups' },
    { value: 'sports', label: 'Sports', desc: 'Team or athletic program' },
    { value: 'school', label: 'School', desc: 'Classroom or district' },
    { value: 'coaching', label: 'Coaching', desc: 'Practice or mentoring' },
    { value: 'creator', label: 'Creator', desc: 'Audience & community' },
  ]

  const steps = [
    // 0: Welcome
    <div key="welcome" className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-white mx-auto mb-6 flex items-center justify-center">
        <span className="text-black font-bold text-heading">N</span>
      </div>
      <h1 className="text-display font-medium mb-3">Build your space</h1>
      <p className="text-body text-now-text-secondary max-w-xs mx-auto">
        Set up your organization on Now in a few minutes. Your members get a personal AI that knows them.
      </p>
    </div>,

    // 1: Org name + type
    <div key="name">
      <h2 className="text-heading font-medium mb-2">Name your space</h2>
      <p className="text-body text-now-text-secondary mb-8">This is what your members will see.</p>
      <div className="space-y-6">
        <Input placeholder="e.g. Grace Community Church" value={orgName} onChange={e => setOrgName(e.target.value)} autoFocus />
        <div>
          <p className="text-caption text-now-text-secondary mb-3">What type of organization?</p>
          <div className="grid grid-cols-2 gap-2">
            {orgTypes.map(t => (
              <button
                key={t.value}
                onClick={() => setOrgType(t.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  orgType === t.value
                    ? 'border-white bg-now-accent-dim'
                    : 'border-now-border hover:border-now-border-hover'
                }`}
              >
                <p className="text-body font-medium">{t.label}</p>
                <p className="text-micro text-now-text-tertiary">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,

    // 2: Logo upload
    <div key="logo">
      <h2 className="text-heading font-medium mb-2">Add your logo</h2>
      <p className="text-body text-now-text-secondary mb-8">Optional. Makes your space feel like yours.</p>
      <div className="flex flex-col items-center">
        <label className="cursor-pointer group">
          {logoPreview ? (
            <div className="relative">
              <img src={logoPreview} alt="Logo" className="w-28 h-28 rounded-2xl object-cover" />
              <button onClick={(e) => { e.preventDefault(); setLogoFile(null); setLogoPreview('') }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-now-error rounded-full flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-now-border group-hover:border-now-border-hover flex flex-col items-center justify-center gap-2 transition-colors">
              <Camera size={24} className="text-now-text-tertiary" />
              <span className="text-micro text-now-text-tertiary">Upload</span>
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
        </label>
      </div>
    </div>,

    // 3: Welcome message
    <div key="welcome-msg">
      <h2 className="text-heading font-medium mb-2">Welcome message</h2>
      <p className="text-body text-now-text-secondary mb-8">First thing members see when they join your space.</p>
      <TextArea
        placeholder="Welcome to our community! We're excited to have you here..."
        value={welcomeMessage}
        onChange={e => setWelcomeMessage(e.target.value)}
        rows={4}
      />
    </div>,

    // 4: Custom questions for members
    <div key="questions">
      <h2 className="text-heading font-medium mb-2">Know your members</h2>
      <p className="text-body text-now-text-secondary mb-8">
        Ask questions during their onboarding. The AI uses these to personalize every interaction.
      </p>
      <div className="space-y-3">
        {customQuestions.map((q, i) => (
          <div key={q.id} className="flex gap-2">
            <Input
              placeholder={`Question ${i + 1}`}
              value={q.question}
              onChange={e => {
                const updated = [...customQuestions]
                updated[i] = { ...q, question: e.target.value }
                setCustomQuestions(updated)
              }}
              className="flex-1"
            />
            <button onClick={() => setCustomQuestions(customQuestions.filter((_, idx) => idx !== i))}
              className="p-3 text-now-text-tertiary hover:text-now-error transition-colors">
              <X size={16} />
            </button>
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={addQuestion}>
          <Plus size={14} /> Add question
        </Button>
      </div>
      {customQuestions.length === 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-micro text-now-text-tertiary">Examples:</p>
          {['What are your goals this year?', 'What\'s your biggest challenge right now?', 'How did you hear about us?'].map(ex => (
            <button key={ex} onClick={() => setCustomQuestions([...customQuestions, { id: crypto.randomUUID(), question: ex, type: 'text', required: false }])}
              className="block w-full text-left text-caption text-now-text-secondary hover:text-white p-2 rounded-lg hover:bg-now-surface transition-colors">
              + {ex}
            </button>
          ))}
        </div>
      )}
    </div>,

    // 5: Content upload
    <div key="content">
      <h2 className="text-heading font-medium mb-2">Feed the AI</h2>
      <p className="text-body text-now-text-secondary mb-8">
        Add content your agent should know. You can always add more later.
      </p>
      <div className="space-y-3">
        {contentUrls.map((url, i) => (
          <div key={i} className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-now-text-tertiary" />
              <input
                value={url}
                onChange={e => { const u = [...contentUrls]; u[i] = e.target.value; setContentUrls(u) }}
                placeholder="URL, YouTube link, or podcast link"
                className="now-input pl-9"
              />
            </div>
            {contentUrls.length > 1 && (
              <button onClick={() => setContentUrls(contentUrls.filter((_, idx) => idx !== i))}
                className="p-3 text-now-text-tertiary hover:text-now-error">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setContentUrls([...contentUrls, ''])}>
          <Plus size={14} /> Add another
        </Button>
      </div>
      <p className="text-micro text-now-text-tertiary mt-4">
        Supports: website URLs, YouTube videos, podcast RSS, PDF links
      </p>
    </div>,

    // 6: Social accounts
    <div key="social">
      <h2 className="text-heading font-medium mb-2">Connect your accounts</h2>
      <p className="text-body text-now-text-secondary mb-8">The AI can reference your social content.</p>
      <div className="space-y-4">
        <Input label="Instagram" placeholder="@username" value={socialAccounts.instagram}
          onChange={e => setSocialAccounts({ ...socialAccounts, instagram: e.target.value })} />
        <Input label="YouTube" placeholder="Channel URL" value={socialAccounts.youtube}
          onChange={e => setSocialAccounts({ ...socialAccounts, youtube: e.target.value })} />
        <Input label="Twitter / X" placeholder="@handle" value={socialAccounts.twitter}
          onChange={e => setSocialAccounts({ ...socialAccounts, twitter: e.target.value })} />
        <Input label="Website" placeholder="https://..." value={socialAccounts.website}
          onChange={e => setSocialAccounts({ ...socialAccounts, website: e.target.value })} />
      </div>
    </div>,

    // 7: Zoom OAuth
    <div key="zoom">
      <h2 className="text-heading font-medium mb-2">Live sessions</h2>
      <p className="text-body text-now-text-secondary mb-8">
        Connect Zoom to run live sessions with real-time transcription.
      </p>
      <div className="text-center py-8">
        {zoomConnected ? (
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-now-success/10 mx-auto flex items-center justify-center">
              <svg className="w-7 h-7 text-now-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-body font-medium">Zoom connected</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 mx-auto flex items-center justify-center">
              <span className="text-blue-400 text-title font-bold">Z</span>
            </div>
            <Button variant="secondary" onClick={connectZoom}>Connect Zoom</Button>
            <p className="text-micro text-now-text-tertiary">You can skip this and connect later</p>
          </div>
        )}
      </div>
    </div>,

    // 8: Monetization
    <div key="monetization">
      <h2 className="text-heading font-medium mb-2">Member access</h2>
      <p className="text-body text-now-text-secondary mb-8">How should members access your space?</p>
      <div className="space-y-3">
        {([
          { mode: 'free' as const, label: 'Free', desc: 'You pay, members access free' },
          { mode: 'paid' as const, label: 'Paid', desc: 'Members pay to join' },
          { mode: 'tiered' as const, label: 'Tiered', desc: 'Free base + paid premium' },
        ]).map(opt => (
          <button
            key={opt.mode}
            onClick={() => setAccessMode(opt.mode)}
            className={`w-full p-4 rounded-xl border text-left transition-all ${
              accessMode === opt.mode
                ? 'border-white bg-now-accent-dim'
                : 'border-now-border hover:border-now-border-hover'
            }`}
          >
            <p className="text-body font-medium">{opt.label}</p>
            <p className="text-caption text-now-text-secondary">{opt.desc}</p>
          </button>
        ))}
      </div>
      {(accessMode === 'paid' || accessMode === 'tiered') && (
        <div className="mt-6">
          <Input
            label="Monthly member price"
            type="number"
            placeholder="29"
            value={memberPrice}
            onChange={e => setMemberPrice(e.target.value)}
            hint="Now takes 10% revenue share"
          />
        </div>
      )}
    </div>,

    // 9: Plan selection + finish
    <div key="plan">
      <h2 className="text-heading font-medium mb-2">Choose your plan</h2>
      <p className="text-body text-now-text-secondary mb-8">Start with Starter. Upgrade anytime.</p>
      <div className="space-y-3">
        {(Object.entries(PRICING_TIERS) as [SubscriptionTier, typeof PRICING_TIERS[SubscriptionTier]][]).map(([key, tier]) => (
          <button
            key={key}
            onClick={() => setSelectedTier(key)}
            className={`w-full p-4 rounded-xl border text-left transition-all ${
              selectedTier === key
                ? 'border-white bg-now-accent-dim'
                : 'border-now-border hover:border-now-border-hover'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body font-medium">{tier.name}</p>
                <p className="text-caption text-now-text-secondary">
                  {tier.members ? `Up to ${tier.members} members` : 'Unlimited members'}
                </p>
              </div>
              <p className="text-title font-medium">${tier.price}<span className="text-caption text-now-text-tertiary">/mo</span></p>
            </div>
          </button>
        ))}
      </div>
    </div>,
  ]

  return (
    <div className="min-h-screen bg-now-bg flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        {step > 0 ? (
          <button onClick={prev} className="text-now-text-secondary hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
        ) : <div className="w-5" />}
        <StepIndicator current={step} total={TOTAL_STEPS} />
        {step > 0 && step < TOTAL_STEPS - 1 ? (
          <button onClick={next} className="text-caption text-now-text-tertiary hover:text-white transition-colors">
            Skip
          </button>
        ) : <div className="w-8" />}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center px-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-sm mx-auto"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        {step === TOTAL_STEPS - 1 ? (
          <Button size="lg" onClick={handleFinish} loading={loading}>
            Launch your space
          </Button>
        ) : (
          <Button size="lg" onClick={next} disabled={step === 1 && !orgName.trim()}>
            Continue
          </Button>
        )}
      </div>
    </div>
  )
}
