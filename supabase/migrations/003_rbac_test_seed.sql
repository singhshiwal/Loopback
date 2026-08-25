-- Step 9 — end-to-end test seed. Run this AFTER 002_agency_rbac.sql,
-- in a scratch/staging Supabase project (not production), then work
-- through the checklist below in supabase.com/docs "impersonate" or by
-- logging in as each seeded user in a real browser session.
--
-- This seeds 2 dummy workspaces, each with an Owner, a Member, and a User,
-- plus a few tickets per workspace.

do $$
declare
  ws_a uuid;
  ws_b uuid;
begin
  insert into workspaces (owner_email, name, plan) values ('owner-a@test.com', 'Agency A', 'free') returning id into ws_a;
  insert into workspaces (owner_email, name, plan) values ('owner-b@test.com', 'Agency B', 'free') returning id into ws_b;

  -- NOTE: user_id is left null here because these aren't real auth.users.
  -- To actually test RLS as a logged-in user, create these accounts through
  -- /signup in the app first, then update these rows' user_id (or better:
  -- use the app's own invite flow so workspace_members gets created for you).
  insert into workspace_members (workspace_id, email, role, accepted_at) values
    (ws_a, 'owner-a@test.com', 'owner', now()),
    (ws_a, 'member-a@test.com', 'member', now()),
    (ws_a, 'user-a@test.com', 'user', now()),
    (ws_b, 'owner-b@test.com', 'owner', now()),
    (ws_b, 'member-b@test.com', 'member', now()),
    (ws_b, 'user-b@test.com', 'user', now());

  insert into tickets (workspace_id, external_id, subject, description, status, priority, tags, created_at_source) values
    (ws_a, 'seed-a1', 'Cannot export report', 'Customer john@acme.com says exports time out', 'open', 'high', 'export,bug', now()),
    (ws_a, 'seed-a2', 'Feature request: dark mode', 'Would love a dark theme', 'open', 'low', 'feature', now()),
    (ws_b, 'seed-b1', 'Billing double-charged', 'Card ending 4417 charged twice, customer angry', 'open', 'urgent', 'billing', now());

  insert into redaction_settings (workspace_id, redact_description, redact_tags)
  values (ws_a, true, false), (ws_b, true, true);
end $$;
