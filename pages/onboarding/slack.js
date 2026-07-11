import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'

export default function OnboardingSlack() {
  const router = useRouter()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')

  useEffect(() => {
    const id = sessionStorage.getItem('lb_workspace_id')
    if (!id) { router.push('/onboarding/company'); return }
    setWorkspaceId(id)
  }, [])

  async function handleNext(e) {
    e.preventDefault()
    setError('')

    if (webhookUrl && !webhookUrl.startsWith('https://hooks.slack.com/')) {
      setError('That does not look like a valid Slack webhook URL.')
      return
    }

    setLoading(true)

    if (webhookUrl) {
      const { error: updateError } = await supabaseAdmin
        .from('workspaces')
        .update({ slack_webhook_url: webhookUrl.trim() })
        .eq('id', workspaceId)

      if (updateError) {
        setError('Failed to save. Please try again.')
        setLoading(false)
        return
      }
    }

    router.push('/onboarding/ready')
  }

  return (
    <>
      <Head>
        <title>Connect Slack — Loopback</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        .slack-steps { margin: 16px 0; display: flex; flex-direction: column; gap: 10px; }
        .slack-step {
          display: flex; gap: 12px; align-items: flex-start;
          font-size: 0.8rem; color: var(--text2); line-height: 1.5;
        }
        .slack-step-num {
          width: 20px; height: 20px; border-radius: 50%;
          background: var(--blue-glow); border: 1px solid var(--blue-dim);
          color: var(--blue); font-size: 0.65rem; font-family: var(--mono);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
        }
      ` }} />

      <div className="auth-wrap">
        <div className="auth-card" style={{ maxWidth: '480px' }}>
          <div className="auth-logo"><div className="auth-logo-dot" />Loopback</div>

          <div className="progress-bar-wrap">
            <div className="progress-step done" />
            <div className="progress-step done" />
            <div className="progress-step done" />
            <div className="progress-step active" />
            <div className="progress-step" />
          </div>

          <div className="step-label">Step 3 of 4</div>
          <h1 className="auth-title">Connect Slack</h1>
          <p className="auth-sub">Your weekly digest will be delivered here every Monday at 8 AM. Takes 2 minutes to set up.</p>

          {error && <div className="msg msg-error">{error}</div>}

          <div className="slack-steps">
            {[
              'Go to api.slack.com/apps → Create New App → From scratch',
              'Name it "Loopback" → select your workspace → Create App',
              'Click "Incoming Webhooks" → toggle On → Add New Webhook to Workspace',
              'Select the channel (e.g. #product-insights) → Allow',
              'Copy the webhook URL and paste it below',
            ].map((step, i) => (
              <div key={i} className="slack-step">
                <div className="slack-step-num">{i + 1}</div>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleNext}>
            <div className="field">
              <label>Slack webhook URL</label>
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Continue →'}
            </button>
          </form>

          <p
            style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text3)', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => router.push('/onboarding/ready')}
          >
            Skip — I will add this later
          </p>
        </div>
      </div>
    </>
  )
}
