-- Loopback billing schema
-- Run this in the Supabase SQL editor (or via `supabase db push` if you use the CLI).
-- Provider-agnostic: works with the mock provider now, and with Razorpay/Stripe/
-- Lemon Squeezy later without changing the shape.

alter table workspaces
  add column if not exists plan text not null default 'free',
  add column if not exists billing_status text not null default 'none',
  add column if not exists billing_provider text,
  add column if not exists billing_customer_id text,
  add column if not exists billing_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

-- plan:              'free' | 'starter' | 'pro'
-- billing_status:    'none' | 'active' | 'past_due' | 'canceled'
-- billing_provider:  'mock' | 'razorpay' | 'stripe' | 'lemonsqueezy'  (null until first checkout)

-- Audit trail of every billing event (checkout, renewal, cancellation, simulated failure).
-- Mirrors what a real webhook log would look like, so swapping providers later means
-- pointing real webhooks at the same table instead of redesigning it.
create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null,
  event_type text not null, -- 'checkout.created' | 'subscription.renewed' | 'subscription.canceled' | 'payment.failed'
  plan text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_workspace_id_idx on billing_events(workspace_id);
