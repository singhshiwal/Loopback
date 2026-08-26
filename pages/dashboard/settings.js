import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'

export default function Settings() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState(null)
  const [domain, setDomain] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [slack, setSlack] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Same active-workspace pattern as dashboard/tickets/billing — an
      // owner_email lookup breaks once an Owner has more than one workspace.
      let workspaceId = sessionStorage.getItem('lb_workspace_id')
      let ws = null

      if (workspaceId) {
        const { data } = await supabase
          .from('workspace_members')
          .select('workspaces(*)')
          .eq('user_id', session.user.id)
          .eq('workspace_id', workspaceId)
          .maybeSingle()
        ws = data?.workspaces || null
      }

      if (!ws) {
        const { data } = await supabase
          .from('workspace_members')
          .select('workspace_id, workspaces(*)')
          .eq('user_id', session.user.id)
          .not('accepted_at', 'is', null)
          .limit(1)
          .maybeSingle()
        ws = data?.workspaces || null
        if (data) sessionStorage.setItem('lb_workspace_id', data.workspace_id)
      }

      if (ws) {
        setWorkspace(ws)
        setDomain(ws.freshdesk_domain || '')
        setSlack(ws.slack_webhook_url || '')
      }
    }
    load()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)
    const updates = { freshdesk_domain: domain.trim(), slack_webhook_url: slack.trim() }
    if (apiKey.trim()) updates.freshdesk_api_key = apiKey.trim()
    const { error: err } = await supabase.from('workspaces').update(updates).eq('id', workspace.id)
    if (err) { setError('Failed to save. Please try again.'); setLoading(false); return }
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <Head>
        <title>Settings — Loopback</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <div className="dash-layout">
        <div className="dash-sidebar">
          <div className="dash-logo">
            <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--blue)',boxShadow:'0 0 8px var(--blue)' }} />
            Loopback
          </div>
          <a href="/dashboard" className="dash-nav-item">📊 &nbsp;Digests</a>
          <a href="/dashboard/settings" className="dash-nav-item active">⚙️ &nbsp;Settings</a>
          <a href="/dashboard/billing" className="dash-nav-item">💳 &nbsp;Billing</a>
        </div>
        <div className="dash-main">
          <div className="dash-header">
            <h1 className="dash-title">Settings</h1>
            <p className="dash-sub">Manage your integrations and workspace.</p>
          </div>
          {error && <div className="msg msg-error">{error}</div>}
          {saved && <div className="msg msg-success">Settings saved.</div>}
          <form onSubmit={handleSave}>
            <div className="settings-section">
              <div className="settings-section-title">Freshdesk</div>
              <div className="settings-section-sub">Connect your Freshdesk account to automatically sync tickets every 24 hours.</div>
              <div className="field">
                <label>Freshdesk domain</label>
                <input type="text" placeholder="yourcompany" value={domain} onChange={e => setDomain(e.target.value)} />
              </div>
              <div className="field">
                <label>API key (leave blank to keep existing)</label>
                <input type="password" placeholder="Enter new API key to update" value={apiKey} onChange={e => setApiKey(e.target.value)} />
              </div>
            </div>
            <div className="settings-section">
              <div className="settings-section-title">Slack</div>
              <div className="settings-section-sub">Your weekly digest is delivered here every Monday at 8 AM.</div>
              <div className="field">
                <label>Slack webhook URL</label>
                <input type="url" placeholder="https://hooks.slack.com/services/..." value={slack} onChange={e => setSlack(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ maxWidth: 200 }}>
              {loading ? 'Saving...' : 'Save settings'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
