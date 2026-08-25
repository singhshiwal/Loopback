-- Loopback RBAC / multi-tenancy migration
-- Implements the 10-step plan using the existing `workspaces` table as the
-- tenant boundary ("agency"). Adds membership, roles, RLS, and a redacted
-- view for the User role. Run this in the Supabase SQL editor.

-- ============================================================
-- STEP 1 — Core schema: workspace_members (= agency_members)
-- ============================================================

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type workspace_role as enum ('owner', 'member', 'user');
  end if;
end$$;

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  role workspace_role not null default 'user',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (workspace_id, email)
);

create index if not exists workspace_members_workspace_id_idx on workspace_members(workspace_id);
create index if not exists workspace_members_user_id_idx on workspace_members(user_id);

-- Backfill: every existing workspace's current owner becomes an 'owner' member,
-- so nobody currently using the product loses access when RLS goes live below.
insert into workspace_members (workspace_id, user_id, email, role, accepted_at)
select w.id, u.id, w.owner_email, 'owner', now()
from workspaces w
left join auth.users u on u.email = w.owner_email
on conflict (workspace_id, email) do nothing;

-- ============================================================
-- STEP 2 — Row-level security
-- ============================================================

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table tickets enable row level security;

-- Security-definer helper: what role (if any) does the current user hold
-- in this workspace. Used by every policy below and by the redacted view.
create or replace function my_role(ws_id uuid)
returns workspace_role
language sql security definer stable
as $$
  select role from workspace_members
  where workspace_id = ws_id and user_id = auth.uid()
  limit 1;
$$;

-- workspaces: visible only to members; only the Owner can update settings
drop policy if exists workspaces_select on workspaces;
create policy workspaces_select on workspaces
  for select using (my_role(id) is not null);

drop policy if exists workspaces_update on workspaces;
create policy workspaces_update on workspaces
  for update using (my_role(id) = 'owner');

drop policy if exists workspaces_insert on workspaces;
create policy workspaces_insert on workspaces
  for insert with check (auth.uid() is not null);
  -- Any signed-in user can create a workspace; app code (Step 3) immediately
  -- inserts the matching owner row into workspace_members.

-- workspace_members: members can see their own workspace's roster;
-- only the Owner can invite/edit/remove
drop policy if exists workspace_members_select on workspace_members;
create policy workspace_members_select on workspace_members
  for select using (my_role(workspace_id) is not null);

drop policy if exists workspace_members_insert on workspace_members;
create policy workspace_members_insert on workspace_members
  for insert with check (my_role(workspace_id) = 'owner' or user_id = auth.uid());
  -- the `user_id = auth.uid()` clause lets a brand-new owner insert their own
  -- first membership row (before any 'owner' row exists to authorize it).

drop policy if exists workspace_members_update on workspace_members;
create policy workspace_members_update on workspace_members
  for update using (my_role(workspace_id) = 'owner' or user_id = auth.uid());

drop policy if exists workspace_members_delete on workspace_members;
create policy workspace_members_delete on workspace_members
  for delete using (my_role(workspace_id) = 'owner');

-- ============================================================
-- STEP 5 — Tickets scoped to membership
-- ============================================================
-- Owner/Member can read the raw table. User role is deliberately excluded
-- here — Users only ever read through the redacted view (Step 6).

drop policy if exists tickets_select on tickets;
create policy tickets_select on tickets
  for select using (my_role(workspace_id) in ('owner', 'member'));

drop policy if exists tickets_insert on tickets;
create policy tickets_insert on tickets
  for insert with check (my_role(workspace_id) in ('owner', 'member'));

-- ============================================================
-- STEP 6 — Redaction settings + redacted view
-- ============================================================

create table if not exists redaction_settings (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  redact_description boolean not null default true,
  redact_tags boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table redaction_settings enable row level security;

drop policy if exists redaction_settings_select on redaction_settings;
create policy redaction_settings_select on redaction_settings
  for select using (my_role(workspace_id) is not null);

drop policy if exists redaction_settings_owner_write on redaction_settings;
create policy redaction_settings_owner_write on redaction_settings
  for all using (my_role(workspace_id) = 'owner')
  with check (my_role(workspace_id) = 'owner');

-- Owned by the migration-running role (postgres), so it bypasses the tickets
-- RLS policy above and can see all rows — the WHERE clause below re-implements
-- membership filtering by hand, and the CASE expressions do the redaction.
-- This is what lets Users read tickets ONLY through this view, never the base table.
create or replace view ticket_dashboard as
select
  t.id,
  t.workspace_id,
  t.external_id,
  case when my_role(t.workspace_id) = 'user' and coalesce(rs.redact_description, true)
       then '[redacted]' else t.subject end as subject,
  case when my_role(t.workspace_id) = 'user' and coalesce(rs.redact_description, true)
       then '[redacted]' else t.description end as description,
  t.status,
  t.priority,
  case when my_role(t.workspace_id) = 'user' and coalesce(rs.redact_tags, false)
       then null else t.tags end as tags,
  t.created_at_source
from tickets t
left join redaction_settings rs on rs.workspace_id = t.workspace_id
where my_role(t.workspace_id) is not null;

grant select on ticket_dashboard to authenticated;
