// Billing abstraction layer.
//
// The rest of the app (API routes, dashboard) only ever calls the exported
// functions below - it never talks to a payment gateway directly. Right now
// `provider` is 'mock', which simulates a gateway entirely inside Supabase
// with no external calls and no KYC/PAN requirement.
//
// TO SWITCH TO A REAL GATEWAY LATER (Razorpay / Stripe / Lemon Squeezy):
//   1. Set BILLING_PROVIDER env var (e.g. 'razorpay').
//   2. Add a case in each function below that calls the real SDK/API instead
//      of the mock logic, then writes the same fields back to `workspaces`.
//   3. Point the gateway's real webhook URL at pages/api/billing/webhook.js
//      and verify its signature there instead of accepting any payload.
// Nothing in the dashboard or paywall-gating code needs to change, since it
// only reads workspace.plan / workspace.billing_status.

import { supabaseAdmin } from './supabase'
import { getPlan } from './plans'

const PROVIDER = process.env.BILLING_PROVIDER || 'mock'

async function logEvent(workspaceId, eventType, plan, raw = {}) {
  await supabaseAdmin.from('billing_events').insert({
    workspace_id: workspaceId,
    provider: PROVIDER,
    event_type: eventType,
    plan,
    raw,
  })
}

// Starts (or upgrades/downgrades to) a paid plan.
// Real-gateway version would create a checkout session and return a redirect
// URL instead of activating immediately.
export async function startCheckout(workspaceId, planId) {
  const plan = getPlan(planId)
  if (plan.id === 'free') throw new Error('Cannot checkout into the free plan')

  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + 30)

  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .update({
      plan: plan.id,
      billing_status: 'active',
      billing_provider: PROVIDER,
      billing_customer_id: `mock_cust_${workspaceId.slice(0, 8)}`,
      billing_subscription_id: `mock_sub_${Date.now()}`,
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
    })
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) throw error

  await logEvent(workspaceId, 'checkout.completed', plan.id, { simulated: true })
  return data
}

// Cancels at the end of the current period (standard SaaS behavior - access
// continues until current_period_end, then a webhook/cron would downgrade).
export async function cancelSubscription(workspaceId) {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .update({ cancel_at_period_end: true })
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) throw error

  await logEvent(workspaceId, 'subscription.cancel_scheduled', data.plan)
  return data
}

// Simulates what a real gateway's renewal webhook would send. Useful for
// testing dashboard states without waiting 30 days.
export async function simulateRenewal(workspaceId) {
  const { data: ws, error: fetchErr } = await supabaseAdmin
    .from('workspaces').select('*').eq('id', workspaceId).single()
  if (fetchErr) throw fetchErr

  if (ws.cancel_at_period_end) {
    return downgradeToFree(workspaceId, 'subscription.canceled')
  }

  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + 30)
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .update({ current_period_end: periodEnd.toISOString(), billing_status: 'active' })
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) throw error
  await logEvent(workspaceId, 'subscription.renewed', data.plan)
  return data
}

// Simulates a failed payment (card decline, etc.) so you can test the
// past_due UI state and any dunning/paywall logic.
export async function simulatePaymentFailure(workspaceId) {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .update({ billing_status: 'past_due' })
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) throw error
  await logEvent(workspaceId, 'payment.failed', data.plan)
  return data
}

export async function downgradeToFree(workspaceId, eventType = 'subscription.canceled') {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .update({
      plan: 'free',
      billing_status: 'none',
      cancel_at_period_end: false,
      current_period_end: null,
    })
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) throw error
  await logEvent(workspaceId, eventType, 'free')
  return data
}

export async function getWorkspaceBilling(workspaceId) {
  const { data, error } = await supabaseAdmin
    .from('workspaces').select('*').eq('id', workspaceId).single()
  if (error) throw error
  return data
}
