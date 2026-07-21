import { simulateRenewal, simulatePaymentFailure, startCheckout, getWorkspaceBilling } from '../../../lib/billing'

// Testing helper only - lets you trigger the states a real webhook would
// normally push (renewed / failed / reactivated) without waiting for a
// billing cycle or wiring up a real gateway. Remove or gate behind an env
// check before a public launch.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workspace_id, action } = req.body
  if (!workspace_id || !action) {
    return res.status(400).json({ error: 'workspace_id and action required' })
  }

  try {
    let workspace
    if (action === 'renew') {
      workspace = await simulateRenewal(workspace_id)
    } else if (action === 'fail') {
      workspace = await simulatePaymentFailure(workspace_id)
    } else if (action === 'reactivate') {
      const current = await getWorkspaceBilling(workspace_id)
      workspace = await startCheckout(workspace_id, current.plan === 'free' ? 'starter' : current.plan)
    } else {
      return res.status(400).json({ error: 'action must be renew, fail, or reactivate' })
    }
    return res.status(200).json({ success: true, workspace })
  } catch (err) {
    console.error('Simulate error:', err)
    return res.status(500).json({ error: err.message || 'Simulation failed' })
  }
}
