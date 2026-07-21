import { supabaseAdmin } from '../../../lib/supabase'
import { ingestWorkspaceTickets } from '../../../lib/ingest'
import { generateAndDeliverDigest } from '../../../lib/digest'

// Triggered automatically by Vercel Cron every Monday (see vercel.json).
// Vercel sends a GET request with `Authorization: Bearer <CRON_SECRET>`
// when the CRON_SECRET environment variable is set on the project -
// that's what we check below. This reuses the same CRON_SECRET already
// used to protect /api/digest and /api/ingest.
//
// For each workspace: refresh Freshdesk tickets (skipped gracefully for
// CSV-only workspaces), then generate + deliver that week's digest
// (skipped gracefully if there are no tickets this week). One workspace
// failing does not stop the others - failures are collected and returned.
export default async function handler(req, res) {
  const auth = req.headers['authorization']
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const { data: workspaces, error } = await supabaseAdmin
    .from('workspaces')
    .select('id')

  if (error) {
    console.error('Cron: failed to load workspaces', error)
    return res.status(500).json({ error: 'Failed to load workspaces' })
  }

  const results = []

  for (const ws of workspaces || []) {
    try {
      const ingestResult = await ingestWorkspaceTickets(ws.id, 7)
      const digestResult = await generateAndDeliverDigest(ws.id)
      results.push({ workspace_id: ws.id, ingest: ingestResult, digest: digestResult })
    } catch (err) {
      console.error(`Cron: failed for workspace ${ws.id}`, err)
      results.push({ workspace_id: ws.id, error: err.message || 'Unknown error' })
    }
  }

  return res.status(200).json({
    success: true,
    ran_at: new Date().toISOString(),
    workspace_count: (workspaces || []).length,
    results,
  })
}

// Cron routes can run long with many workspaces - raise the timeout on
// plans that support it (Hobby is capped at 60s regardless).
export const config = {
  maxDuration: 120,
}
