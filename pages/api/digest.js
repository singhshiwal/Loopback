import { supabaseAdmin } from '../../lib/supabase'
import { synthesiseTickets } from '../../lib/ai'
import { sendDigestEmail } from '../../lib/resend'

// Cron calls this with a shared secret. Manual "Run digest now" clicks
// authenticate with the user's own Supabase session instead.
function isCronRequest(req) {
  const secret = req.headers['x-loopback-secret']
  return Boolean(process.env.CRON_SECRET) && secret === process.env.CRON_SECRET
}

// Verifies the request's bearer token belongs to a real logged-in user,
// and that the user is an Owner or Member of the workspace they're
// requesting a digest for (Users can't trigger ingestion, per tickets_insert RLS).
async function isAuthorisedUser(req, workspace_id) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return false

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return false

  const { data: membership } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .single()

  return Boolean(membership) && ['owner', 'member'].includes(membership.role)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workspace_id } = req.body

  if (!workspace_id) {
    return res.status(400).json({ error: 'workspace_id required' })
  }

  // Protect this endpoint — allow the cron job (shared secret) or the
  // workspace owner's own logged-in session, nothing else.
  const authorised = isCronRequest(req) || await isAuthorisedUser(req, workspace_id)
  if (!authorised) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  try {
    // 1. Fetch workspace details
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('id', workspace_id)
      .single()

    if (wsError || !workspace) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    // 2. Fetch this week's tickets
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: tickets, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('workspace_id', workspace_id)
      .gte('ingested_at', weekAgo.toISOString())
      .order('ingested_at', { ascending: false })

    if (ticketError) {
      return res.status(500).json({ error: 'Failed to fetch tickets' })
    }

    if (!tickets || tickets.length === 0) {
      return res.status(200).json({ message: 'No tickets this week — digest skipped', ticket_count: 0 })
    }

    // 3. Run AI synthesis
    const { result, usage, promptVersion } = await synthesiseTickets(tickets)

    // 4. Store digest in Supabase
    const weekOf = weekAgo.toISOString().split('T')[0]
    const { data: digest, error: digestError } = await supabaseAdmin
      .from('digests')
      .insert({
        workspace_id,
        week_of: weekOf,
        pain_point: result.pain_point,
        feature_request: result.feature_request,
        churn_signal: result.churn_signal,
        ticket_count: tickets.length,
        raw_json: { result, usage, promptVersion },
      })
      .select()
      .single()

    if (digestError) {
      console.error('Failed to store digest:', digestError)
    }

    // 5. Send email digest
    let emailStatus = 'skipped'
    if (workspace.owner_email) {
      try {
        await sendDigestEmail(workspace.owner_email, result, weekOf)
        emailStatus = 'sent'

        // Log delivery
        if (digest) {
          await supabaseAdmin.from('delivery_log').insert({
            digest_id: digest.id,
            workspace_id,
            channel: 'email',
            status: 'delivered',
          })
        }
      } catch (emailErr) {
        console.error('Email delivery failed:', emailErr)
        emailStatus = 'failed'
      }
    }

    // 6. Send Slack digest
    let slackStatus = 'skipped'
    if (workspace.slack_webhook_url) {
      try {
        const slackPayload = {
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: 'Loopback Weekly Digest', emoji: true },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Week of ${new Date(weekOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}* · ${tickets.length} tickets analysed`,
              },
            },
            { type: 'divider' },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🔴 *Top Pain Point* · ${result.pain_point.severity?.toUpperCase()} · ${result.pain_point.ticket_count} tickets\n*${result.pain_point.theme}*\n_"${result.pain_point.supporting_quotes?.[0]}"_`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🔵 *Top Feature Request* · ${result.feature_request.severity?.toUpperCase()} · ${result.feature_request.ticket_count} tickets\n*${result.feature_request.theme}*\n_"${result.feature_request.supporting_quotes?.[0]}"_`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🟡 *Churn Signal* · ${result.churn_signal.severity?.toUpperCase()} · ${result.churn_signal.ticket_count} tickets\n*${result.churn_signal.theme}*\n_"${result.churn_signal.supporting_quotes?.[0]}"_`,
              },
            },
          ],
        }

        const slackRes = await fetch(workspace.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        })

        slackStatus = slackRes.ok ? 'sent' : 'failed'

        if (digest) {
          await supabaseAdmin.from('delivery_log').insert({
            digest_id: digest.id,
            workspace_id,
            channel: 'slack',
            status: slackStatus === 'sent' ? 'delivered' : 'failed',
          })
        }
      } catch (slackErr) {
        console.error('Slack delivery failed:', slackErr)
        slackStatus = 'failed'
      }
    }

    return res.status(200).json({
      success: true,
      digest_id: digest?.id,
      ticket_count: tickets.length,
      email: emailStatus,
      slack: slackStatus,
      usage,
    })
  } catch (err) {
    console.error('Digest handler error:', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
