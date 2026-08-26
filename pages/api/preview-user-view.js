import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../../lib/supabase'

const SUPABASE_URL = 'https://fstymtartfimrlndgkhu.supabase.co'
const ANON_KEY = 'sb_publishable_6I4nQOTb1zNV5vwRMWH5jw_adgpO803'

// Owner-only "preview as User" endpoint.
//
// This does NOT change anyone's real role and does NOT touch RLS — the
// caller is still genuinely the Owner the whole time. It exists because a
// UI toggle can't make the database believe you're a different role: RLS
// and the ticket_dashboard view check the real workspace_members row for
// auth.uid(), so an Owner querying that view still sees Owner-level data.
//
// Instead, this route (a) confirms the caller really is the Owner of this
// workspace, then (b) fetches the raw rows via the admin key and applies
// the exact same redaction rules the ticket_dashboard view uses, so the
// Owner can see what the User role's screen looks like without creating a
// second account. It is a display-only simulation, not a security test —
// real isolation still needs to be verified with an actual User account.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: userError } = await callerClient.auth.getUser()
  if (userError || !user) return res.status(401).json({ error: 'Invalid session' })

  const { workspace_id } = req.query
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })

  const { data: membership } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return res.status(403).json({ error: 'Only the workspace Owner can preview the User view' })
  }

  const { data: tickets, error: ticketsError } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('workspace_id', workspace_id)
    .order('created_at_source', { ascending: false })
    .limit(50)

  if (ticketsError) {
    console.error('Preview ticket fetch error:', ticketsError)
    return res.status(500).json({ error: 'Failed to load tickets' })
  }

  const { data: settings } = await supabaseAdmin
    .from('redaction_settings')
    .select('*')
    .eq('workspace_id', workspace_id)
    .single()

  const redactDescription = settings ? settings.redact_description : true
  const redactTags = settings ? settings.redact_tags : false

  const redacted = (tickets || []).map(t => ({
    id: t.id,
    workspace_id: t.workspace_id,
    external_id: t.external_id,
    subject: redactDescription ? '[redacted]' : t.subject,
    description: redactDescription ? '[redacted]' : t.description,
    status: t.status,
    priority: t.priority,
    tags: redactTags ? null : t.tags,
    created_at_source: t.created_at_source,
  }))

  return res.status(200).json({ tickets: redacted })
}
