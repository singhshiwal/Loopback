import { supabaseAdmin } from '../../lib/supabase'

// Links any pending workspace invites to the signed-in user.
//
// Why this is a server route: a pending invite row has user_id = null, so the
// browser (anon key + the user's session) can neither SELECT it (my_role() is
// null for that user) nor UPDATE it (policy requires owner or user_id = uid).
// Doing the link from the client therefore silently did nothing, and invited
// Members/Users fell through to "create your own workspace" onboarding.
//
// Only links invites whose email matches the caller's *verified* email.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'Invalid session' })

  if (!user.email || !user.email_confirmed_at) {
    return res.status(403).json({ error: 'Email not verified' })
  }

  const email = user.email.toLowerCase().trim()

  const { data: linked, error } = await supabaseAdmin
    .from('workspace_members')
    .update({ user_id: user.id, accepted_at: new Date().toISOString() })
    .eq('email', email)
    .is('user_id', null)
    .select('id')

  if (error) {
    console.error('accept-invite error:', error)
    return res.status(500).json({ error: 'Failed to accept invite' })
  }

  return res.status(200).json({ linked: (linked || []).length })
}
