import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { createAgent } from '@/lib/openclaw'
import { useDeepgram } from '@/lib/hooks/useDeepgram'
import { Button, Input, TextArea, StepIndicator, VoiceInput } from '@/components/ui'
import type { Org, CustomQuestion } from '@/types'

const TOTAL_STEPS = 7

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d < 0 ? 300 : -300, opacity: 0 }),
}

export function MemberOnboarding() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const navigate = useNavigate()
  const { slug } = useParams()
  const { user, updateUser, refreshOrgs, setCurrentOrg } = useAuthStore()
  const deepgram = useDeepgram()

  const [org, setOrg] = useState<Org | null>(null)
  const [bio, setBio] = useState(user?.global_profile?.bio || '')
  const [goals, setGoals] = useState<string[]>(user?.global_profile?.goals || [''])
  const [social, setSocial] = useState(user?.social_links || { instagram: '', twitter: '', youtube: '', website: '', tiktok: '', linkedin: '' })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [voiceIntro, setVoiceIntro] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (slug) {
      supabase.from('orgs').select('*').eq('slug', slug).single()
        .then(({ data }) => { if (data) setOrg(data) })
    }
  }, [slug])

  const next = () => { setDirection(1); setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)) }
  const prev = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)) }

  const customQuestions: CustomQuestion[] = org?.onboarding_config?.custom_questions || []

  const handleFinish = async () => {
    if (!user || !org) return
    setLoading(true)
    try {
      // Update user profile
      await updateUser({
        global_profile: { bio, goals: goals.filter(g => g.trim()), preferences: {} },
        social_links: social,
        onboarding_completed: true,
      })

      // Join org
      const memberProfile = { answers, voice_intro: voiceIntro }
      await supabase.from('org_members').insert({
        user_id: user.id,
        org_id: org.id,
        role: 'member',
        member_profile: memberProfile,
      })

      // Create personal agent
      const agentId = await createAgent({
        orgId: org.id,
        userId: user.id,
        memberProfile,
        globalProfile: { bio, goals, social },
        orgName: org.name,
        orgType: org.type,
      })

      // Store agent ID
      await supabase.from('org_members')
        .update({ agent_id: agentId })
        .eq('user_id', user.id)
        .eq('org_id', org.id)

      await refreshOrgs()
      setCurrentOrg(org.id)
      navigate('/home')
    } catch (err) {
      console.error('Member onboarding error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-now-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const steps = [
    // 0: Welcome
    <div key="welcome" className="text-center">
      {org.logo_url ? (
        <img src={org.logo_url} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6" />
      ) : (
        <div className="w-20 h-20 rounded-2xl bg-white mx-auto mb-6 flex items-center justify-center">
          <span className="text-black font-bold text-heading">{org.name[0]}</span>
        </div>
      )}
      <h1 className="text-heading font-medium mb-2">{org.onboarding_config?.welcome_message || `Welcome to ${org.name}`}</h1>
      <p className="text-body text-now-text-secondary">
        You're about to get a personal AI that actually knows you.
      </p>
    </div>,

    // 1: About you
    <div key="about">
      <h2 className="text-heading font-medium mb-2">About you</h2>
      <p className="text-body text-now-text-secondary mb-8">This helps your AI understand who you are.</p>
      <TextArea
        label="Short bio"
        placeholder="I'm a..."
        value={bio}
        onChange={e => setBio(e.target.value)}
      />
    </div>,

    // 2: Goals
    <div key="goals">
      <h2 className="text-heading font-medium mb-2">Your goals</h2>
      <p className="text-body text-now-text-secondary mb-8">What do you want to accomplish?</p>
      <div className="space-y-3">
        {goals.map((g, i) => (
          <Input
            key={i}
            placeholder={`Goal ${i + 1}`}
            value={g}
            onChange={e => { const u = [...goals]; u[i] = e.target.value; setGoals(u) }}
          />
        ))}
        <Button variant="secondary" size="sm" onClick={() => setGoals([...goals, ''])}>
          + Add another
        </Button>
      </div>
    </div>,

    // 3: Social links
    <div key="social">
      <h2 className="text-heading font-medium mb-2">Social links</h2>
      <p className="text-body text-now-text-secondary mb-8">Connect your world. Optional.</p>
      <div className="space-y-4">
        <Input label="Instagram" placeholder="@username" value={social.instagram}
          onChange={e => setSocial({ ...social, instagram: e.target.value })} />
        <Input label="Twitter / X" placeholder="@handle" value={social.twitter}
          onChange={e => setSocial({ ...social, twitter: e.target.value })} />
        <Input label="LinkedIn" placeholder="Profile URL" value={social.linkedin}
          onChange={e => setSocial({ ...social, linkedin: e.target.value })} />
      </div>
    </div>,

    // 4: Org-specific questions
    <div key="custom">
      <h2 className="text-heading font-medium mb-2">{org.name} wants to know</h2>
      <p className="text-body text-now-text-secondary mb-8">These answers make your AI personal to you here.</p>
      {customQuestions.length > 0 ? (
        <div className="space-y-6">
          {customQuestions.map(q => (
            <div key={q.id}>
              {q.type === 'textarea' ? (
                <TextArea
                  label={q.question}
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              ) : (
                <Input
                  label={q.question}
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-body text-now-text-secondary">No custom questions — you're all set here.</p>
        </div>
      )}
    </div>,

    // 5: Voice intro
    <div key="voice">
      <h2 className="text-heading font-medium mb-2">Voice intro</h2>
      <p className="text-body text-now-text-secondary mb-8">
        Tell your AI about yourself in your own words. Speak naturally — it transcribes automatically.
      </p>
      <VoiceInput
        value={voiceIntro || deepgram.fullText}
        onChange={setVoiceIntro}
        isRecording={deepgram.isRecording}
        onToggleRecording={() => {
          if (deepgram.isRecording) {
            deepgram.stop()
            setVoiceIntro(deepgram.fullText)
          } else {
            deepgram.start()
          }
        }}
        placeholder="Tap the mic and introduce yourself..."
      />
    </div>,

    // 6: Ready
    <div key="ready" className="text-center">
      <div className="w-20 h-20 rounded-full bg-now-success/10 mx-auto mb-6 flex items-center justify-center">
        <svg className="w-10 h-10 text-now-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-heading font-medium mb-2">You're all set</h1>
      <p className="text-body text-now-text-secondary max-w-xs mx-auto">
        Your personal AI is being built right now. It knows your goals, your context, and your situation.
      </p>
    </div>,
  ]

  return (
    <div className="min-h-screen bg-now-bg flex flex-col safe-top safe-bottom">
      <div className="flex items-center justify-between px-5 py-4">
        {step > 0 ? (
          <button onClick={prev} className="text-now-text-secondary hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        ) : <div className="w-5" />}
        <StepIndicator current={step} total={TOTAL_STEPS} />
        <div className="w-8" />
      </div>

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

      <div className="px-6 pb-6">
        {step === TOTAL_STEPS - 1 ? (
          <Button size="lg" onClick={handleFinish} loading={loading}>
            Enter {org.name}
          </Button>
        ) : (
          <Button size="lg" onClick={next}>Continue</Button>
        )}
      </div>
    </div>
  )
}
