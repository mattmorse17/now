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
-- Row Level Security Policies

alter table orgs enable row level security;
alter table users enable row level security;
alter table org_members enable row level security;
alter table content enable row level security;
alter table sessions enable row level security;
alter table notifications enable row level security;
alter table agent_interactions enable row level security;
alter table member_progress enable row level security;
alter table billing_events enable row level security;

-- USERS: can read/update own profile
create policy "users_select_own" on users for select using (id = auth.uid());
create policy "users_update_own" on users for update using (id = auth.uid());
create policy "users_insert_own" on users for insert with check (id = auth.uid());

-- Users visible to org co-members
create policy "users_select_org_members" on users for select using (
  id in (
    select om.user_id from org_members om
    where om.org_id in (select org_id from org_members where user_id = auth.uid())
  )
);

-- ORGS: admins can manage, members can read
create policy "orgs_select_member" on orgs for select using (
  id in (select org_id from org_members where user_id = auth.uid())
);
create policy "orgs_insert_admin" on orgs for insert with check (admin_user_id = auth.uid());
create policy "orgs_update_admin" on orgs for update using (admin_user_id = auth.uid());
-- Allow reading org by slug for joining
create policy "orgs_select_public_slug" on orgs for select using (true);

-- ORG_MEMBERS: members see co-members, admins manage
create policy "org_members_select" on org_members for select using (
  org_id in (select org_id from org_members where user_id = auth.uid())
);
create policy "org_members_insert_self" on org_members for insert with check (user_id = auth.uid());
create policy "org_members_insert_admin" on org_members for insert with check (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);
create policy "org_members_update_admin" on org_members for update using (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);
create policy "org_members_delete_admin" on org_members for delete using (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);

-- CONTENT: org members can read, admins can write
create policy "content_select" on content for select using (
  org_id in (select org_id from org_members where user_id = auth.uid())
);
create policy "content_insert" on content for insert with check (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);
create policy "content_update" on content for update using (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);
create policy "content_delete" on content for delete using (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);

-- SESSIONS: org members can read, admins can write
create policy "sessions_select" on sessions for select using (
  org_id in (select org_id from org_members where user_id = auth.uid())
);
create policy "sessions_insert" on sessions for insert with check (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);
create policy "sessions_update" on sessions for update using (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);

-- NOTIFICATIONS: users see own, admins see org's
create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
create policy "notifications_select_admin" on notifications for select using (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);
create policy "notifications_insert_admin" on notifications for insert with check (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);
create policy "notifications_update_own" on notifications for update using (user_id = auth.uid());

-- AGENT_INTERACTIONS: users see own
create policy "agent_select_own" on agent_interactions for select using (user_id = auth.uid());
create policy "agent_insert_own" on agent_interactions for insert with check (user_id = auth.uid());
-- Admins see org interactions
create policy "agent_select_admin" on agent_interactions for select using (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);

-- MEMBER_PROGRESS: users see own, admins see org's
create policy "progress_select_own" on member_progress for select using (user_id = auth.uid());
create policy "progress_select_admin" on member_progress for select using (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);
create policy "progress_upsert_own" on member_progress for insert with check (user_id = auth.uid());
create policy "progress_update_own" on member_progress for update using (user_id = auth.uid());

-- BILLING_EVENTS: admins only
create policy "billing_select_admin" on billing_events for select using (
  org_id in (select id from orgs where admin_user_id = auth.uid())
);
-- Database Functions & Triggers

-- Auto-create user profile on auth signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Increment token usage for an org
create or replace function increment_token_usage(p_org_id uuid, p_tokens integer)
returns void as $$
begin
  update orgs
  set token_usage_current = token_usage_current + p_tokens
  where id = p_org_id;
end;
$$ language plpgsql security definer;

-- Update member progress after interaction
create or replace function update_member_progress()
returns trigger as $$
begin
  insert into member_progress (user_id, org_id, interaction_count, last_interaction_at)
  values (new.user_id, new.org_id, 1, now())
  on conflict (user_id, org_id)
  do update set
    interaction_count = member_progress.interaction_count + 1,
    last_interaction_at = now(),
    profile_depth_score = least(100, member_progress.profile_depth_score + 1);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_agent_interaction
  after insert on agent_interactions
  for each row execute function update_member_progress();

-- Track notification opens
create or replace function mark_notification_opened(p_notification_id uuid)
returns void as $$
begin
  update notifications
  set opened_at = now()
  where id = p_notification_id and user_id = auth.uid() and opened_at is null;

  -- Update member progress
  update member_progress
  set notifications_opened = notifications_opened + 1
  where user_id = auth.uid()
    and org_id = (select org_id from notifications where id = p_notification_id);
end;
$$ language plpgsql security definer;

-- Generate org slug from name
create or replace function generate_slug(p_name text)
returns text as $$
declare
  base_slug text;
  final_slug text;
  counter integer := 0;
begin
  base_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;

  while exists (select 1 from orgs where slug = final_slug) loop
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  end loop;

  return final_slug;
end;
$$ language plpgsql;

-- Reset monthly token usage (call from cron)
create or replace function reset_monthly_token_usage()
returns void as $$
begin
  update orgs set token_usage_current = 0;
end;
$$ language plpgsql security definer;

-- Get org member count
create or replace function get_org_member_count(p_org_id uuid)
returns integer as $$
  select count(*)::integer from org_members where org_id = p_org_id;
$$ language sql security definer;

-- Get member engagement summary for admin dashboard
create or replace function get_engagement_summary(p_org_id uuid)
returns json as $$
  select json_build_object(
    'total_members', (select count(*) from org_members where org_id = p_org_id),
    'active_last_7d', (
      select count(distinct user_id) from agent_interactions
      where org_id = p_org_id and created_at > now() - interval '7 days'
    ),
    'total_interactions', (
      select count(*) from agent_interactions
      where org_id = p_org_id and created_at > now() - interval '30 days'
    ),
    'notifications_sent', (
      select count(*) from notifications
      where org_id = p_org_id and sent_at > now() - interval '30 days'
    ),
    'notification_open_rate', (
      select case
        when count(*) = 0 then 0
        else round(count(*) filter (where opened_at is not null)::numeric / count(*)::numeric * 100)
      end
      from notifications
      where org_id = p_org_id and sent_at > now() - interval '30 days'
    ),
    'content_items', (select count(*) from content where org_id = p_org_id),
    'live_sessions', (
      select count(*) from sessions where org_id = p_org_id and type = 'live'
    )
  );
$$ language sql security definer;

-- Realtime: enable for sessions (live transcript updates)
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table agent_interactions;
