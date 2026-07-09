import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// From address — update once fuffad.com domain is verified in Resend
const FROM = 'Loopback <digest@fuffad.com>'

/**
 * Send weekly digest email
 * @param {string} to - recipient email
 * @param {Object} digest - { pain_point, feature_request, churn_signal }
 * @param {string} weekOf - ISO date string
 */
export async function sendDigestEmail(to, digest, weekOf) {
  const { pain_point, feature_request, churn_signal } = digest

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, sans-serif; background: #f9fafb; margin: 0; padding: 0; }
  .wrap { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
  .header { background: #0f172a; padding: 28px 32px; }
  .header h1 { color: #fff; font-size: 20px; font-weight: 700; margin: 0 0 4px; }
  .header p { color: #94a3b8; font-size: 13px; margin: 0; font-family: monospace; }
  .body { padding: 28px 32px; }
  .intro { font-size: 14px; color: #6b7280; margin-bottom: 24px; line-height: 1.6; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
  .card-header { display: flex; align-items: center; justify-content: space-between; padding: 11px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .card-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-family: monospace; }
  .label-pain { color: #dc2626; }
  .label-feat { color: #3b7eff; }
  .label-churn { color: #d97706; }
  .sev { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
  .sev-high { background: #fef2f2; color: #dc2626; }
  .sev-med { background: #eff6ff; color: #3b7eff; }
  .sev-low { background: #fffbeb; color: #d97706; }
  .card-body { padding: 14px 16px; }
  .theme { font-size: 14px; font-weight: 600; color: #0d0d0d; margin-bottom: 4px; }
  .count { font-size: 11px; color: #9ca3af; font-family: monospace; margin-bottom: 10px; }
  .quote { font-size: 12px; color: #6b7280; line-height: 1.55; padding: 7px 10px; background: #f9fafb; border-left: 2px solid #e5e7eb; margin-bottom: 6px; font-style: italic; }
  .footer { padding: 20px 32px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
  .footer a { color: #3b7eff; text-decoration: none; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Loopback Weekly Digest</h1>
    <p>Week of ${new Date(weekOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  </div>
  <div class="body">
    <p class="intro">Here is what your customers are telling you this week, synthesised from your support tickets.</p>

    <!-- Pain Point -->
    <div class="card">
      <div class="card-header">
        <span class="card-label label-pain">Top pain point</span>
        <span class="sev sev-${pain_point.severity === 'high' ? 'high' : pain_point.severity === 'medium' ? 'med' : 'low'}">${pain_point.severity?.toUpperCase()} · ${pain_point.ticket_count} tickets</span>
      </div>
      <div class="card-body">
        <div class="theme">${pain_point.theme}</div>
        <div class="count">${pain_point.ticket_count} tickets matched this theme</div>
        ${(pain_point.supporting_quotes || []).map(q => `<div class="quote">"${q}"</div>`).join('')}
      </div>
    </div>

    <!-- Feature Request -->
    <div class="card">
      <div class="card-header">
        <span class="card-label label-feat">Top feature request</span>
        <span class="sev sev-${feature_request.severity === 'high' ? 'high' : feature_request.severity === 'medium' ? 'med' : 'low'}">${feature_request.severity?.toUpperCase()} · ${feature_request.ticket_count} tickets</span>
      </div>
      <div class="card-body">
        <div class="theme">${feature_request.theme}</div>
        <div class="count">${feature_request.ticket_count} tickets matched this theme</div>
        ${(feature_request.supporting_quotes || []).map(q => `<div class="quote">"${q}"</div>`).join('')}
      </div>
    </div>

    <!-- Churn Signal -->
    <div class="card">
      <div class="card-header">
        <span class="card-label label-churn">Churn signal</span>
        <span class="sev sev-${churn_signal.severity === 'high' ? 'high' : churn_signal.severity === 'medium' ? 'med' : 'low'}">${churn_signal.severity?.toUpperCase()} · ${churn_signal.ticket_count} tickets</span>
      </div>
      <div class="card-body">
        <div class="theme">${churn_signal.theme}</div>
        <div class="count">${churn_signal.ticket_count} tickets matched this theme</div>
        ${(churn_signal.supporting_quotes || []).map(q => `<div class="quote">"${q}"</div>`).join('')}
      </div>
    </div>
  </div>
  <div class="footer">
    Sent by <a href="https://www.fuffad.com">Loopback</a> · <a href="#">Unsubscribe</a>
  </div>
</div>
</body>
</html>`

  const result = await resend.emails.send({
    from: FROM,
    to,
    subject: `Loopback Digest — Week of ${new Date(weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    html,
  })

  return result
}

/**
 * Send waitlist confirmation email
 * @param {string} to - recipient email
 */
export async function sendWaitlistConfirmation(to) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'You are on the Loopback waitlist',
    html: `
<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:40px auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="font-size:18px;font-weight:700;color:#0d0d0d;margin:0 0 12px">You are on the list.</h2>
  <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 16px">
    We are onboarding the first 20 teams personally. We will reach out before August 17, 2026 when your spot is ready.
  </p>
  <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0">
    In the meantime, reply to this email if you have questions or want to jump the queue.
  </p>
  <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
    Loopback · <a href="https://www.fuffad.com" style="color:#3b7eff;text-decoration:none">fuffad.com</a>
  </div>
</div>`,
  })
}

/**
 * Send early access confirmation email
 * @param {string} to - recipient email
 * @param {string} company - company name
 */
export async function sendEarlyAccessConfirmation(to, company) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Loopback early access request received',
    html: `
<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:40px auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="font-size:18px;font-weight:700;color:#0d0d0d;margin:0 0 12px">Request received for ${company || 'your team'}.</h2>
  <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 16px">
    We will reach out within 48 hours to schedule your onboarding. We are keeping the first cohort small so we can support every team personally.
  </p>
  <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0">
    Reply to this email if you want to share more about your support setup before we connect.
  </p>
  <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
    Loopback · <a href="https://www.fuffad.com" style="color:#3b7eff;text-decoration:none">fuffad.com</a>
  </div>
</div>`,
  })
}
