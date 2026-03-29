import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { getFeedItems } from '@/lib/openclaw'
import { Card, Badge, EmptyState } from '@/components/ui'
import { RefreshCw, Megaphone, FileText, Calendar, Users, Flame, ChevronRight, Sparkles } from 'lucide-react'

type FeedItemType = 'org_announcement' | 'session_recap' | 'weekly_followup' | 'connection_suggestion'

interface FeedItem {
  id: string
  type: FeedItemType
  personalizedHeadline: string
  body: string
  sourceLabel: string
  ctaText?: string
  ctaAction?: string
  relevanceScore: number
}

const PLACEHOLDER_CARDS: FeedItem[] = [
  {
    id: 'placeholder-1',
    type: 'session_recap',
    personalizedHeadline: "Last week's session — here's what mattered for your goals",
    body: "Your agent pulled the three moments from Tuesday's session that connect directly to what you're working on. The framework discussed maps exactly to your Q2 challenge.",
    sourceLabel: "Session Recap · Mar 25",
    ctaText: "See highlights",
    ctaAction: "/home/sessions",
    relevanceScore: 0.97,
  },
  {
    id: 'placeholder-2',
    type: 'weekly_followup',
    personalizedHeadline: "3 of 5 weekly goals completed — your strongest week yet",
    body: "You've hit consistency for 12 days straight. Your agent noticed a pattern: the days you start with the morning check-in, you complete 2x more goals. Tomorrow is a check-in day.",
    sourceLabel: "Weekly Progress · Your Agent",
    ctaText: "Review goals",
    ctaAction: "/home/goals",
    relevanceScore: 0.94,
  },
  {
    id: 'placeholder-3',
    type: 'connection_suggestion',
    personalizedHeadline: "Someone in the community is working on the exact same problem",
    body: "Based on your recent conversations, your agent identified a member whose focus areas overlap significantly with yours. You're both navigating the same inflection point.",
    sourceLabel: "Connection · Community",
    ctaText: "See profile",
    ctaAction: "/home/community",
    relevanceScore: 0.88,
  },
]

const TYPE_CONFIG: Record<FeedItemType, {
  icon: React.FC<{ size?: number; className?: string }>
  label: string
  badgeVariant: 'default' | 'success' | 'warning' | 'error' | 'live'
  accent: string
}> = {
  org_announcement: {
    icon: Megaphone,
    label: 'Announcement',
    badgeVariant: 'warning',
    accent: 'border-now-warning/20',
  },
  session_recap: {
    icon: FileText,
    label: 'Session Recap',
    badgeVariant: 'default',
    accent: 'border-now-border',
  },
  weekly_followup: {
    icon: Calendar,
    label: 'Weekly Check-in',
    badgeVariant: 'success',
    accent: 'border-now-success/20',
  },
  connection_suggestion: {
    icon: Users,
    label: 'Connection',
    badgeVariant: 'default',
    accent: 'border-now-border',
  },
}

function GoalDots({ completed, total }: { completed: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            i < completed ? 'bg-now-success' : 'bg-now-border'
          }`}
        />
      ))}
    </div>
  )
}

function FeedCard({ item, index }: { item: FeedItem; index: number }) {
  const config = TYPE_CONFIG[item.type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Card className={`space-y-3 ${config.accent}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-now-surface border border-now-border flex items-center justify-center">
              <Icon size={14} className="text-now-text-secondary" />
            </div>
            <Badge variant={config.badgeVariant}>{config.label}</Badge>
          </div>
          <p className="text-micro text-now-text-tertiary">{item.sourceLabel}</p>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h3 className="text-body font-medium text-now-text leading-snug">
            {item.personalizedHeadline}
          </h3>
          <p className="text-caption text-now-text-secondary leading-relaxed">
            {item.body}
          </p>
        </div>

        {/* CTA */}
        {item.ctaText && (
          <div className="pt-1">
            <button className="flex items-center gap-1 text-caption font-medium text-white/70 hover:text-white transition-colors">
              {item.ctaText}
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

export function MemberFeed() {
  const { user, currentOrg, currentMembership } = useAuthStore()
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [streak, setStreak] = useState(0)
  const [weeklyGoals, setWeeklyGoals] = useState({ completed: 0, total: 5 })
  const [usePlaceholders, setUsePlaceholders] = useState(false)

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (!user || !currentOrg) return

    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const agentId = currentMembership?.agent_id || ''

      // Fetch agent interactions and notifications from Supabase in parallel
      const [interactionsRes, notificationsRes, progressRes] = await Promise.all([
        supabase
          .from('agent_interactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('org_id', currentOrg.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('org_id', currentOrg.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('member_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('org_id', currentOrg.id)
          .single(),
      ])

      // Compute streak from interactions
      if (interactionsRes.data && interactionsRes.data.length > 0) {
        const dates = interactionsRes.data.map(i =>
          new Date(i.created_at).toDateString()
        )
        const uniqueDates = [...new Set(dates)]
        let streakCount = 0
        const today = new Date()
        for (let d = 0; d < 30; d++) {
          const check = new Date(today)
          check.setDate(today.getDate() - d)
          if (uniqueDates.includes(check.toDateString())) {
            streakCount++
          } else {
            break
          }
        }
        setStreak(streakCount)
      }

      // Weekly goals from progress
      if (progressRes.data) {
        const completed = Math.min(progressRes.data.interaction_count % 5, 5)
        setWeeklyGoals({ completed, total: 5 })
      }

      // Call OpenClaw for AI-personalized feed items
      const userGoals = (user.global_profile?.goals as string[]) || []
      const recentContext = interactionsRes.data?.[0]?.message || ''

      const items = await getFeedItems({
        userId: user.id,
        orgId: currentOrg.id,
        agentId,
        userGoals,
        recentContext,
      })

      if (items && items.length > 0) {
        setFeedItems(items.sort((a, b) => b.relevanceScore - a.relevanceScore))
        setUsePlaceholders(false)
      } else {
        // No real data — show placeholders
        setUsePlaceholders(true)
        setFeedItems([])
      }
    } catch {
      setUsePlaceholders(true)
      setFeedItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, currentOrg, currentMembership])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  const displayItems = usePlaceholders ? PLACEHOLDER_CARDS : feedItems
  const isEmpty = !loading && !usePlaceholders && feedItems.length === 0

  return (
    <div className="px-5 py-6 space-y-5 max-w-lg mx-auto">
      {/* Header row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-now-text-tertiary" />
            <p className="text-caption text-now-text-secondary font-medium">Your feed</p>
          </div>
          <p className="text-micro text-now-text-tertiary">
            Personalized by your agent
          </p>
        </div>

        <button
          onClick={() => loadFeed(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-micro text-now-text-tertiary hover:text-now-text transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </motion.div>

      {/* Streak + weekly goals bar */}
      {(streak > 0 || weeklyGoals.completed > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="flex items-center justify-between py-3">
            {streak > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">🔥</span>
                <div>
                  <p className="text-body font-medium">{streak} day streak</p>
                  <p className="text-micro text-now-text-tertiary">Keep it going</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-now-text-tertiary" />
                <p className="text-caption text-now-text-secondary">Start your streak today</p>
              </div>
            )}

            <div className="flex flex-col items-end gap-1">
              <p className="text-micro text-now-text-tertiary">
                {weeklyGoals.completed}/{weeklyGoals.total} goals
              </p>
              <GoalDots completed={weeklyGoals.completed} total={weeklyGoals.total} />
            </div>
          </Card>
        </motion.div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="now-card space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-now-surface animate-pulse" />
                <div className="h-5 w-24 rounded-full bg-now-surface animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-4/5 rounded bg-now-surface animate-pulse" />
                <div className="h-3 w-full rounded bg-now-surface animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-now-surface animate-pulse" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <EmptyState
          icon={<Sparkles size={20} />}
          title="Your feed is warming up"
          description="Your agent is learning what matters to you — check back soon."
        />
      )}

      {/* Placeholder notice */}
      {!loading && usePlaceholders && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-1"
        >
          <div className="h-px flex-1 bg-now-border" />
          <p className="text-micro text-now-text-tertiary whitespace-nowrap">
            Preview — your feed is warming up
          </p>
          <div className="h-px flex-1 bg-now-border" />
        </motion.div>
      )}

      {/* Feed cards */}
      {!loading && (
        <AnimatePresence>
          <div className="space-y-3">
            {displayItems.map((item, index) => (
              <FeedCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Bottom padding for mobile nav */}
      <div className="h-6" />
    </div>
  )
}
