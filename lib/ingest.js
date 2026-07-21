import { supabaseAdmin } from './supabase'

function mapPriority(priority) {
  const map = { 1: 'low', 2: 'medium', 3: 'high', 4: 'urgent' }
  return map[priority] || 'medium'
}

async function fetchFreshdeskTickets(domain, apiKey, daysBack = 30) {
  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  const sinceStr = since.toISOString()

  const credentials = Buffer.from(`${apiKey}:X`).toString('base64')
  const url = `https://${domain}.freshdesk.com/api/v2/tickets?updated_since=${sinceStr}&per_page=100&order_by=created_at&order_type=desc`

  const response = await fetch(url, {
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Freshdesk API error ${response.status}: ${text}`)
  }

  return response.json()
}

// Pulls fresh tickets from Freshdesk for one workspace and upserts them.
// Used by pages/api/ingest.js (manual/periodic trigger) and
// pages/api/cron/weekly-digest.js (refreshes tickets right before generating
// the weekly digest, so the digest reflects the latest week's data).
export async function ingestWorkspaceTickets(workspace_id, days_back = 7) {
  const { data: workspace, error: wsError } = await supabaseAdmin
    .from('workspaces')
    .select('freshdesk_domain, freshdesk_api_key')
    .eq('id', workspace_id)
    .single()

  if (wsError || !workspace) {
    return { ok: false, status: 404, error: 'Workspace not found' }
  }

  if (!workspace.freshdesk_domain || !workspace.freshdesk_api_key) {
    // Not an error — CSV-only workspaces skip ingestion, digest just runs
    // against whatever tickets are already stored.
    return { ok: true, skipped: true, reason: 'Freshdesk not connected for this workspace' }
  }

  const freshdeskTickets = await fetchFreshdeskTickets(
    workspace.freshdesk_domain, workspace.freshdesk_api_key, days_back
  )

  if (!freshdeskTickets || freshdeskTickets.length === 0) {
    return { ok: true, ingested: 0, message: 'No tickets found in Freshdesk' }
  }

  const ticketsToInsert = freshdeskTickets.map(t => ({
    workspace_id,
    external_id: String(t.id),
    subject: t.subject || '',
    description: t.description_text || t.description || '',
    status: t.status === 2 ? 'open' : t.status === 3 ? 'pending' : t.status === 4 ? 'resolved' : 'closed',
    priority: mapPriority(t.priority),
    tags: (t.tags || []).join(', '),
    created_at_source: t.created_at,
  }))

  const { error: insertError } = await supabaseAdmin
    .from('tickets')
    .upsert(ticketsToInsert, { onConflict: 'workspace_id,external_id', ignoreDuplicates: true })

  if (insertError) {
    console.error('Ticket insert error:', insertError)
    return { ok: false, status: 500, error: 'Failed to store tickets' }
  }

  return { ok: true, fetched: freshdeskTickets.length, ingested: ticketsToInsert.length }
}
