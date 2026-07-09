import { supabaseAdmin } from '../../lib/supabase'

// Simple auth check
function isAuthorised(req) {
  const secret = req.headers['x-loopback-secret']
  return secret === process.env.CRON_SECRET
}

/**
 * Fetch tickets from Freshdesk API
 * @param {string} domain - Freshdesk subdomain e.g. "acme" for acme.freshdesk.com
 * @param {string} apiKey - Freshdesk API key
 * @param {number} daysBack - how many days of tickets to fetch
 */
async function fetchFreshdeskTickets(domain, apiKey, daysBack = 30) {
  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  const sinceStr = since.toISOString()

  const credentials = Buffer.from(`${apiKey}:X`).toString('base64')
  const url = `https://${domain}.freshdesk.com/api/v2/tickets?updated_since=${sinceStr}&per_page=100&order_by=created_at&order_type=desc`

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Freshdesk API error ${response.status}: ${text}`)
  }

  return response.json()
}

/**
 * Map Freshdesk priority number to text
 */
function mapPriority(priority) {
  const map = { 1: 'low', 2: 'medium', 3: 'high', 4: 'urgent' }
  return map[priority] || 'medium'
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
    // 1. Fetch workspace
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .select('freshdesk_domain, freshdesk_api_key')
      .eq('id', workspace_id)
      .single()

    if (wsError || !workspace) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    if (!workspace.freshdesk_domain || !workspace.freshdesk_api_key) {
      return res.status(400).json({ error: 'Freshdesk not connected for this workspace' })
    }

    // 2. Fetch from Freshdesk
    const freshdeskTickets = await fetchFreshdeskTickets(
      workspace.freshdesk_domain,
      workspace.freshdesk_api_key,
      days_back
    )

    if (!freshdeskTickets || freshdeskTickets.length === 0) {
      return res.status(200).json({ message: 'No tickets found in Freshdesk', ingested: 0 })
    }

    // 3. Map to Loopback schema
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

    // 4. Upsert — avoid duplicates on re-sync
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('tickets')
      .upsert(ticketsToInsert, { onConflict: 'workspace_id,external_id', ignoreDuplicates: true })

    if (insertError) {
      console.error('Ticket insert error:', insertError)
      return res.status(500).json({ error: 'Failed to store tickets' })
    }

    return res.status(200).json({
      success: true,
      fetched: freshdeskTickets.length,
      ingested: ticketsToInsert.length,
      workspace_id,
    })
  } catch (err) {
    console.error('Ingest handler error:', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
