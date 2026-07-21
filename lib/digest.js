import { supabaseAdmin } from './supabase'
import { synthesiseTickets } from './claude'
import { sendDigestEmail } from './resend'

// Generates this week's digest for one workspace and delivers it to
// whichever channels are configured (email always, Slack if webhook is set).
// Used by pages/api/digest.js (manual/onboarding trigger) and
// pages/api/cron/weekly-digest.js (Monday automatic run) so both paths
// share one implementation.
export async function generateAndDeliverDigest(workspace_id) {
  const { data: workspace, error: wsError } = await supabaseAdmin
    .from('workspaces')
    .select('*')
    .eq('id', workspace_id)
    .single()

  if (wsError || !workspace) {
    return { ok: false, status: 404, error: 'Workspace not found' }
  }

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: tickets, error: ticketError } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('workspace_id', workspace_id)
    .gte('ingested_at', weekAgo.toISOString())
    .order('ingested_at', { ascending: false })

  if (ticketError) {
    return { ok: false, status: 500, error: 'Failed to fetch tickets' }
  }

  if (!tickets || tickets.length === 0) {
    return { ok: true, skipped: true, message: 'No tickets this week — digest skipped', ticket_count: 0 }
  }

  const { result, usage, promptVersion } = await synthesiseTickets(tickets)

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

  let emailStatus = 'skipped'
  if (workspace.owner_email) {
    try {
      await sendDigestEmail(workspace.owner_email, result, weekOf)
      emailStatus = 'sent'
      if (digest) {
        await supabaseAdmin.from('delivery_log').insert({
          digest_id: digest.id, workspace_id, channel: 'email', status: 'delivered',
        })
      }
    } catch (emailErr) {
      console.error('Email delivery failed:', emailErr)
      emailStatus = 'failed'
    }
  }

  let slackStatus = 'skipped'
  if (workspace.slack_webhook_url) {
    try {
      const slackPayload = {
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: 'Loopback Weekly Digest', emoji: true } },
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
          digest_id: digest.id, workspace_id, channel: 'slack',
          status: slackStatus === 'sent' ? 'delivered' : 'failed',
        })
      }
    } catch (slackErr) {
      console.error('Slack delivery failed:', slackErr)
      slackStatus = 'failed'
    }
  }

  return {
    ok: true,
    digest_id: digest?.id,
    ticket_count: tickets.length,
    email: emailStatus,
    slack: slackStatus,
    usage,
  }
}
