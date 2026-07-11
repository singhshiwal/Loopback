import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'

export default function Dashboard() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState(null)
  const [digests, setDigests] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email)

      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('*')
        .eq('owner_email', session.user.email)
        .single()

      if (!ws) { router.push('/onboarding/company'); return }
      setWorkspace(ws)

      const { data: digs } = await supabaseAdmin
        .from('digests')
        .select('*')
        .eq('workspace_id', ws.id)
        .order('created_at', { ascending: false })
        .limit(8)

      setDigests(digs || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const sevColor = { high: 'var(--red)', medium: 'var(--blue)', low: 'var(--amber)' }

  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: '0.9rem' }}>
          Loading your workspace...
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Dashboard — Loopback</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />

      <div className="dash-layout">
        {/* Sidebar */}
        <div className="dash-sidebar">
          <div className="dash-logo">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', boxShadow: '0 0 8px var(--blue)' }} />
            Loopback
          </div>
          <a href="/dashboard" className="dash-nav-item active">📊 &nbsp;Digests</a>
          <a href="/dashboard/settings" className="dash-nav-item">⚙️ &nbsp;Settings</a>
          <div style={{ flex: 1 }} />
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '8px', wordBreak: 'break-all' }}>{userEmail}</div>
            <div
              onClick={handleSignOut}
              style={{ fontSize: '0.78rem', color: 'var(--text3)', cursor: 'pointer' }}
            >
              Sign out
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="dash-main">
          <div className="dash-header">
            <h1 className="dash-title">{workspace?.name || 'Your workspace'}</h1>
            <p className="dash-sub">Weekly product intelligence from your support tickets.</p>
          </div>

          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Digests generated</div>
              <div className="stat-val blue">{digests.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tickets analysed</div>
              <div className="stat-val">{digests.reduce((a, d) => a + (d.ticket_count || 0), 0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Support tool</div>
              <div className="stat-val" style={{ fontSize: '1rem' }}>{workspace?.freshdesk_domain ? 'Freshdesk ✓' : 'Not connected'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Slack</div>
              <div className="stat-val" style={{ fontSize: '1rem' }}>{workspace?.slack_webhook_url ? 'Connected ✓' : 'Not connected'}</div>
            </div>
          </div>

          {/* Digest history */}
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text2)' }}>DIGEST HISTORY</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Last {digests.length} digests</span>
          </div>

          {digests.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>📭</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text2)', marginBottom: '8px' }}>No digests yet.</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Your first digest will arrive on Monday at 8 AM, or connect your support tool to trigger one now.</p>
              <a href="/dashboard/settings" style={{ display: 'inline-block', marginTop: '16px', fontSize: '0.85rem', color: 'var(--blue)' }}>Go to settings →</a>
            </div>
          ) : (
            digests.map((digest, i) => (
              <div key={digest.id} className="digest-item">
                <div className="di-header" onClick={() => setExpanded(expanded === i ? null : i)}>
                  <div>
                    <div className="di-week">Week of {formatDate(digest.week_of)}</div>
                    <div className="di-meta">{digest.ticket_count} tickets · {formatDate(digest.created_at)}</div>
                  </div>
                  <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>{expanded === i ? '▲' : '▼'}</span>
                </div>

                {expanded === i && (
                  <div className="di-body">
                    {[
                      { key: 'pain_point', label: 'Top Pain Point', cls: 'pain' },
                      { key: 'feature_request', label: 'Top Feature Request', cls: 'feat' },
                      { key: 'churn_signal', label: 'Churn Signal', cls: 'churn' },
                    ].map(({ key, label, cls }) => {
                      const item = digest[key]
                      if (!item) return null
                      return (
                        <div key={key} className="di-insight">
                          <div className={`di-label ${cls}`}>{label} · {item.severity?.toUpperCase()} · {item.ticket_count} tickets</div>
                          <div className="di-theme">{item.theme}</div>
                          {(item.supporting_quotes || []).slice(0, 1).map((q, qi) => (
                            <div key={qi} className="di-quote">"{q}"</div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
