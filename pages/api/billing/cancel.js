import { cancelSubscription } from '../../../lib/billing'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workspace_id } = req.body
  if (!workspace_id) {
    return res.status(400).json({ error: 'workspace_id required' })
  }

  try {
    const workspace = await cancelSubscription(workspace_id)
    return res.status(200).json({ success: true, workspace })
  } catch (err) {
    console.error('Cancel error:', err)
    return res.status(500).json({ error: err.message || 'Cancel failed' })
  }
}
