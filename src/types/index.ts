export type OrgType = 'church' | 'sports' | 'school' | 'coaching' | 'creator'
export type MemberRole = 'admin' | 'member'
export type ContentType = 'pdf' | 'url' | 'video' | 'audio' | 'text' | 'social_link'
export type SessionType = 'live' | 'async'
export type SessionStatus = 'draft' | 'active' | 'ended'
export type NotificationTrigger = 'post' | 'session' | 'manual' | 'scheduled'
export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'enterprise'
export type MemberAccessMode = 'free' | 'paid' | 'tiered'

export interface Org {
  id: string
  name: string
  slug: string
  type: OrgType
  admin_user_id: string
  logo_url: string | null
  primary_color: string
  content_library: ContentMeta[]
  onboarding_config: OnboardingConfig
  subscription_tier: SubscriptionTier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  member_access_mode: MemberAccessMode
  member_price_cents: number
  stripe_product_id: string | null
  stripe_price_id: string | null
  token_usage_current: number
  token_limit: number
  zoom_access_token: string | null
  zoom_refresh_token: string | null
  zapier_webhook_url: string | null
  created_at: string
}

export interface OnboardingConfig {
  welcome_message: string
  custom_questions: CustomQuestion[]
  require_social_links: boolean
  require_voice_intro: boolean
}

export interface CustomQuestion {
  id: string
  question: string
  type: 'text' | 'textarea' | 'select' | 'multiselect'
  options?: string[]
  required: boolean
}

export interface ContentMeta {
  id: string
  title: string
  type: ContentType
  added_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  global_profile: GlobalProfile
  social_links: SocialLinks
  fcm_token: string | null
  onboarding_completed: boolean
  created_at: string
}

export interface GlobalProfile {
  bio: string
  goals: string[]
  preferences: Record<string, unknown>
}

export interface SocialLinks {
  instagram: string
  twitter: string
  youtube: string
  website: string
  tiktok: string
  linkedin: string
}

export interface OrgMember {
  user_id: string
  org_id: string
  role: MemberRole
  member_profile: Record<string, unknown>
  agent_id: string | null
  voice_intro_url: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string
  joined_at: string
  // Joined fields
  users?: User
  orgs?: Org
}

export interface Content {
  id: string
  org_id: string
  uploaded_by: string
  type: ContentType
  title: string
  description: string
  source_url: string | null
  file_path: string | null
  storage_key: string | null
  processed: boolean
  processing_error: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Session {
  id: string
  org_id: string
  created_by: string
  type: SessionType
  title: string
  description: string
  status: SessionStatus
  transcript: string
  deepgram_session_id: string | null
  recording_url: string | null
  metadata: Record<string, unknown>
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface Notification {
  id: string
  org_id: string
  session_id: string | null
  user_id: string
  message: string
  title: string
  trigger_type: NotificationTrigger
  preview_approved: boolean
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  created_at: string
}

export interface AgentInteraction {
  id: string
  user_id: string
  org_id: string
  agent_id: string | null
  message: string
  response: string
  is_voice: boolean
  token_count: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface MemberProgress {
  id: string
  user_id: string
  org_id: string
  interaction_count: number
  sessions_attended: number
  notifications_opened: number
  last_interaction_at: string | null
  profile_depth_score: number
  engagement_signals: EngagementSignal[]
  created_at: string
}

export interface EngagementSignal {
  type: string
  value: number
  timestamp: string
}

export interface BillingEvent {
  id: string
  org_id: string
  user_id: string | null
  event_type: string
  amount_cents: number
  platform_fee_cents: number
  stripe_event_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Agent streaming
export interface AgentStreamChunk {
  type: 'text' | 'done' | 'error'
  content: string
  token_count?: number
}

// Pricing tiers
export const PRICING_TIERS: Record<SubscriptionTier, {
  name: string
  price: number
  members: number | null
  tokens: number
}> = {
  starter: { name: 'Starter', price: 97, members: 50, tokens: 100_000 },
  growth: { name: 'Growth', price: 297, members: 250, tokens: 500_000 },
  pro: { name: 'Pro', price: 797, members: 1000, tokens: 1_000_000 },
  enterprise: { name: 'Enterprise', price: 2497, members: null, tokens: 2_000_000 },
}

export const PLATFORM_REVENUE_SHARE = 0.10 // 10%
