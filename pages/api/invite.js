import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../../lib/supabase'
import { sendInviteEmail } from '../../lib/resend'
import { getPlan } from '../../lib/plans'

const SUPABASE_URL = 'https://fstymtartfimrlndgkhu.supabase.co'
const ANON_KEY = 'sb_publishable_6I4nQOTb1zNV5vwRMWH5jw_adgpO803'

// Step 4 — Member and User provisioning.
// Owner-initiated only: there is no self-serve signup into a workspace.
// The invitee gets a pending workspace_members row (user_id null) here,
// and it's linked to their auth user_id at signup time (see pages/signup.js).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  // Verify the caller's identity against their own access token (not the
  // admin/service key) so we know who is actually asking.
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: userError } = await callerClient.auth.getUser()
  if (userError || !user) return res.status(401).json({ error: 'Invalid session' })

  const { workspace_id, email, role } = req.body
  if (!workspace_id || !email || !['member', 'user'].includes(role)) {
    return res.status(400).json({ error: 'workspace_id, email, and role (member|user) are required' })
  }

  // Confirm the caller is the Owner of this workspace before provisioning.
  const { data: membership } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return res.status(403).json({ error: 'Only the workspace Owner can invite members' })
  }

  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('name, plan')
    .eq('id', workspace_id)
    .single()

  // Seat cap: count everyone already on this workspace (accepted or still
  // pending) plus the Owner themself, and compare to the plan's max seats.
  const plan = getPlan(workspace?.plan)
  const { count: seatCount } = await supabaseAdmin
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace_id)

  if ((seatCount || 0) >= plan.maxSeats) {
    return res.status(403).json({
      error: `The ${plan.name} plan allows up to ${plan.maxSeats} seat${plan.maxSeats === 1 ? '' : 's'} on this workspace. Upgrade to Team for up to 5 seats.`,
    })
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('workspace_members')
    .insert({
      workspace_id,
      email: email.toLowerCase().trim(),
      role,
      user_id: null,
      accepted_at: null,
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return res.status(409).json({ error: 'This email is already invited or a member of this workspace' })
    }
    console.error('Invite insert error:', insertError)
    return res.status(500).json({ error: 'Failed to create invite' })
  }

  try {
    await sendInviteEmail(email, workspace?.name || 'a Loopback workspace', role, user.email)
  } catch (e) {
    console.error('Invite email failed (membership row still created):', e)
  }

  return res.status(200).json({ success: true, invite: inserted })
}
