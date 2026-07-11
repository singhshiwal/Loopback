import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'

const TOOLS = [
  { id: 'freshdesk', name: 'Freshdesk', logo: '🟢', available: true, hint: 'Find your API key in Freshdesk → Profile Settings → API Key' },
  { id: 'zendesk', name: 'Zendesk', logo: '🟡', available: false, hint: 'Coming in V2' },
  { id: 'intercom', name: 'Intercom', logo: '🔵', available: false, hint: 'Coming in V2' },
  { id: 'csv', name: 'CSV Upload', logo: '📄', available: true, hint: 'Export tickets as CSV from any support tool and upload here' },
]

export default function OnboardingConnect() {
  const router = useRouter()
  const [selectedTool, setSelectedTool] = useState('freshdesk')
  const [domain, setDomain] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [csvFile, setCsvFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')

  useEffect(() => {
    const id = sessionStorage.getItem('lb_workspace_id')
    if (!id) { router.push('/onboarding/company'); return }
    setWorkspaceId(id)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login')
    })
  }, [])

  async function handleNext(e) {
    e.preventDefault()
    setError('')

    if (selectedTool === 'freshdesk') {
      if (!domain.trim()) { setError('Freshdesk domain is required.'); return }
      if (!apiKey.trim()) { setError('API key is required.'); return }
    }

    setLoading(true)

    const updates = selectedTool === 'freshdesk'
      ? { freshdesk_domain: domain.trim().replace('.freshdesk.com', ''), freshdesk_api_key: apiKey.trim() }
      : {}

    const { error: updateError } = await supabaseAdmin
      .from('workspaces')
      .update(updates)
      .eq('id', workspaceId)

    if (updateError) {
      setError('Failed to save. Please try again.')
      setLoading(false)
      return
    }

    if (selectedTool === 'csv' && csvFile) {
      sessionStorage.setItem('lb_csv_pending', 'true')
    }

    router.push('/onboarding/slack')
  }

  return (
    <>
      <Head>
        <title>Connect your support tool — Loopback</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        .tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .tool-card {
          padding: 14px; border-radius: 10px; border: 1px solid var(--border);
          cursor: pointer; transition: all 0.2s; background: var(--bg);
          display: flex; align-items: center; gap: 10px;
          font-size: 0.875rem; font-weight: 500;
          position: relative;
        }
        .tool-card:hover { border-color: var(--border2); }
        .tool-card.selected { border-color: var(--blue); background: var(--blue-glow); }
        .tool-card.disabled { opacity: 0.4; cursor: not-allowed; }
        .tool-logo { font-size: 1.1rem; }
        .coming-soon {
          position: absolute; top: -8px; right: 8px;
          font-size: 0.6rem; font-family: var(--mono);
          background: var(--surface2); color: var(--text3);
          border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px;
        }
        .hint { font-size: 0.75rem; color: var(--text3); margin-top: 8px; line-height: 1.5; }
      ` }} />

      <div className="auth-wrap">
        <div className="auth-card" style={{ maxWidth: '480px' }}>
          <div className="auth-logo"><div className="auth-logo-dot" />Loopback</div>

          <div className="progress-bar-wrap">
            <div className="progress-step done" />
            <div className="progress-step done" />
            <div className="progress-step active" />
            <div className="progress-step" />
            <div className="progress-step" />
          </div>

          <div className="step-label">Step 2 of 4</div>
          <h1 className="auth-title">Connect your support tool</h1>
          <p className="auth-sub">Where do your customers raise issues?</p>

          {error && <div className="msg msg-error">{error}</div>}

          <div className="tool-grid">
            {TOOLS.map(tool => (
              <div
                key={tool.id}
                className={`tool-card${selectedTool === tool.id ? ' selected' : ''}${!tool.available ? ' disabled' : ''}`}
                onClick={() => tool.available && setSelectedTool(tool.id)}
              >
                {!tool.available && <span className="coming-soon">V2</span>}
                <span className="tool-logo">{tool.logo}</span>
                {tool.name}
              </div>
            ))}
          </div>

          <form onSubmit={handleNext}>
            {selectedTool === 'freshdesk' && (
              <>
                <div className="field">
                  <label>Freshdesk domain</label>
                  <input
                    type="text"
                    placeholder="yourcompany (from yourcompany.freshdesk.com)"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label>Freshdesk API key</label>
                  <input
                    type="password"
                    placeholder="Your Freshdesk API key"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                  />
                  <p className="hint">Find it in Freshdesk → click your avatar → Profile Settings → API Key (bottom right)</p>
                </div>
              </>
            )}

            {selectedTool === 'csv' && (
              <div className="field">
                <label>Upload tickets CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setCsvFile(e.target.files[0])}
                  style={{ padding: '8px' }}
                />
                <p className="hint">Export tickets from any support tool as CSV. Required columns: Subject, Description, Status, Priority.</p>
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Continue →'}
            </button>
          </form>

          <p style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text3)', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => router.push('/onboarding/slack')}>
            Skip for now →
          </p>
        </div>
      </div>
    </>
  )
}
