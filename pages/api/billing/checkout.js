import { startCheckout } from '../../../lib/billing'
import { PLANS } from '../../../lib/plans'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workspace_id, plan_id } = req.body

  if (!workspace_id) {
    return res.status(400).json({ error: 'workspace_id required' })
  }
  if (!plan_id || !PLANS[plan_id] || plan_id === 'free') {
    return res.status(400).json({ error: 'Valid plan_id required (starter or pro)' })
  }

  try {
    // Mock provider: activates immediately, no redirect needed.
    // A real gateway would instead return { checkout_url } here for the
    // client to redirect to.
    const workspace = await startCheckout(workspace_id, plan_id)
    return res.status(200).json({ success: true, workspace })
  } catch (err) {
    console.error('Checkout error:', err)
    return res.status(500).json({ error: err.message || 'Checkout failed' })
  }
}
