import { supabaseAdmin } from '../../../lib/supabase'

// This is where a real gateway's webhook will point once you go live
// (Razorpay/Stripe/Lemon Squeezy all call a URL like this on payment events).
//
// TODO before going live with a real provider:
//   1. Verify the request signature using that provider's SDK (do NOT trust
//      the payload just because it hit this URL - anyone can POST here).
//   2. Map the provider's event names to the actions below.
//   3. Look up the workspace by billing_customer_id / billing_subscription_id
//      instead of trusting a workspace_id in the body.
//
// Right now, with BILLING_PROVIDER=mock, nothing calls this route - use
// /api/billing/simulate.js instead to trigger these states during testing.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (process.env.BILLING_PROVIDER !== 'mock' && !req.headers['x-webhook-verified']) {
    return res.status(401).json({ error: 'Unverified webhook - signature check not implemented yet' })
  }

  const { workspace_id, event_type, plan } = req.body
  if (!workspace_id || !event_type) {
    return res.status(400).json({ error: 'workspace_id and event_type required' })
  }

  try {
    await supabaseAdmin.from('billing_events').insert({
      workspace_id,
      provider: process.env.BILLING_PROVIDER || 'mock',
      event_type,
      plan: plan || null,
      raw: req.body,
    })
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}
