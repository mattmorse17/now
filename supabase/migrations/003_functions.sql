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
