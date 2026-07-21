import { generateAndDeliverDigest } from '../../lib/digest'

// Manual/onboarding trigger — kept for the "generate my first digest now"
// button in onboarding. The Monday automatic run lives in
// pages/api/cron/weekly-digest.js and shares the same logic via lib/digest.js.
function isAuthorised(req) {
  const secret = req.headers['x-loopback-secret']
  return secret === process.env.CRON_SECRET
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isAuthorised(req)) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const { workspace_id } = req.body
  if (!workspace_id) {
    return res.status(400).json({ error: 'workspace_id required' })
  }

  try {
    const result = await generateAndDeliverDigest(workspace_id)
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error })
    }
    return res.status(200).json(result)
  } catch (err) {
    console.error('Digest handler error:', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
