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
