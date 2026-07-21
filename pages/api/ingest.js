import { ingestWorkspaceTickets } from '../../lib/ingest'

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

  const { workspace_id, days_back = 7 } = req.body
  if (!workspace_id) {
    return res.status(400).json({ error: 'workspace_id required' })
  }

  try {
    const result = await ingestWorkspaceTickets(workspace_id, days_back)
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error })
    }
    return res.status(200).json({ success: true, workspace_id, ...result })
  } catch (err) {
    console.error('Ingest handler error:', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
