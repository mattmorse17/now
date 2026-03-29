-- Now Platform Database Schema
-- Run: supabase db push

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ENUMS
create type org_type as enum ('church', 'sports', 'school', 'coaching', 'creator');
create type member_role as enum ('admin', 'member');
create type content_type as enum ('pdf', 'url', 'video', 'audio', 'text', 'social_link');
create type session_type as enum ('live', 'async');
create type session_status as enum ('draft', 'active', 'ended');
create type notification_trigger as enum ('post', 'session', 'manual', 'scheduled');
create type subscription_tier as enum ('starter', 'growth', 'pro', 'enterprise');
create type member_access_mode as enum ('free', 'paid', 'tiered');

-- ORGS
create table orgs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  type org_type not null default 'creator',
  admin_user_id uuid not null,
  logo_url text,
  primary_color text default '#FFFFFF',
  content_library jsonb default '[]'::jsonb,
  onboarding_config jsonb default '{
    "welcome_message": "",
    "custom_questions": [],
    "require_social_links": false,
    "require_voice_intro": false
  }'::jsonb,
  -- Monetization
  subscription_tier subscription_tier default 'starter',
  stripe_customer_id text,
  stripe_subscription_id text,
  member_access_mode member_access_mode default 'free',
  member_price_cents integer default 0,
  stripe_product_id text,
  stripe_price_id text,
  -- Token usage
  token_usage_current integer default 0,
  token_limit integer default 100000,
  -- Integrations
  zoom_access_token text,
  zoom_refresh_token text,
  zapier_webhook_url text,
  created_at timestamptz default now()
);

-- USERS
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  avatar_url text,
  global_profile jsonb default '{
    "bio": "",
    "goals": [],
    "preferences": {}
  }'::jsonb,
  social_links jsonb default '{
    "instagram": "",
    "twitter": "",
    "youtube": "",
    "website": "",
    "tiktok": "",
    "linkedin": ""
  }'::jsonb,
  fcm_token text,
  onboarding_completed boolean default false,
  created_at timestamptz default now()
);

-- ORG_MEMBERS
create table org_members (
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  role member_role not null default 'member',
  member_profile jsonb default '{}'::jsonb,
  agent_id text,
  voice_intro_url text,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'none',
  joined_at timestamptz default now(),
  primary key (user_id, org_id)
);

-- CONTENT
create table content (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  uploaded_by uuid not null references users(id),
  type content_type not null,
  title text not null default '',
  description text default '',
  source_url text,
  file_path text,
  storage_key text,
  processed boolean default false,
  processing_error text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- SESSIONS
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_by uuid not null references users(id),
  type session_type not null default 'live',
  title text not null default '',
  description text default '',
  status session_status not null default 'draft',
  transcript text default '',
  deepgram_session_id text,
  recording_url text,
  metadata jsonb default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  session_id uuid references sessions(id),
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  title text default '',
  trigger_type notification_trigger not null default 'manual',
  preview_approved boolean default false,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz default now()
);

-- AGENT_INTERACTIONS
create table agent_interactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  agent_id text,
  message text not null,
  response text default '',
  is_voice boolean default false,
  token_count integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- MEMBER_PROGRESS: Track deepening profile + engagement
create table member_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  interaction_count integer default 0,
  sessions_attended integer default 0,
  notifications_opened integer default 0,
  last_interaction_at timestamptz,
  profile_depth_score integer default 0,
  engagement_signals jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  unique (user_id, org_id)
);

-- BILLING_EVENTS: Revenue share tracking
create table billing_events (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid references users(id),
  event_type text not null,
  amount_cents integer not null default 0,
  platform_fee_cents integer default 0,
  stripe_event_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- INDEXES
create index idx_org_members_org on org_members(org_id);
create index idx_org_members_user on org_members(user_id);
create index idx_content_org on content(org_id);
create index idx_sessions_org on sessions(org_id);
create index idx_sessions_status on sessions(org_id, status);
create index idx_notifications_user on notifications(user_id);
create index idx_notifications_org_session on notifications(org_id, session_id);
create index idx_agent_interactions_user_org on agent_interactions(user_id, org_id);
create index idx_agent_interactions_created on agent_interactions(created_at desc);
create index idx_member_progress_user_org on member_progress(user_id, org_id);
create index idx_billing_events_org on billing_events(org_id);
create index idx_orgs_slug on orgs(slug);
