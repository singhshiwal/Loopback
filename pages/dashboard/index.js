import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'

export default function Dashboard() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState(null)
  const [digests, setDigests] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email)
      const { data: ws } = await supabase
        .from('workspaces').select('*').eq('owner_email', session.user.email).single()
      if (!ws) { router.push('/onboarding/company'); return }
      setWorkspace(ws)
      const { data: digs } = await supabase
        .from('digests').select('*').eq('workspace_id', ws.id)
        .order('created_at', { ascending: false }).limit(8)
      setDigests(digs || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleRunDigest() {
    if (!workspace) return
    setRunning(true)
    setRunStatus(null)
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-loopback-secret': 'loopback-mvp-secret' },
        body: JSON.stringify({ workspace_id: workspace.id })
      })
      const data = await res.json()
      if (data.success) {
        setRunStatus({ ok: true, msg: `Digest generated from ${data.ticket_count} tickets. Check your Slack and email.` })
        const { data: digs } = await supabase
          .from('digests').select('*').eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false }).limit(8)
        setDigests(digs || [])
      } else {
        setRunStatus({ ok: false, msg: data.message || data.error || 'Something went wrong.' })
      }
    } catch (e) {
      setRunStatus({ ok: false, msg: e.message })
    }
    setRunning(false)
  }

  async function handleCsvUpload(e) {
    e.preventDefault()
    if (!csvFile || !workspace) return
    setUploading(true)
    setRunStatus(null)
    try {
      const text = await csvFile.text()
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
      const subjectIdx = headers.findIndex(h => h.includes('subject') || h.includes('title'))
      const descIdx = headers.findIndex(h => h.includes('description') || h.includes('body'))
      const prioIdx = headers.findIndex(h => h.includes('priority'))
      const tagIdx = headers.findIndex(h => h.includes('tag'))

      const tickets = lines.slice(1).map((line, i) => {
        const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g) || line.split(',')
        const clean = cols.map(c => c?.replace(/^"|"$/g, '').trim() || '')
        return {
          workspace_id: workspace.id,
          external_id: `csv-${Date.now()}-${i}`,
          subject: subjectIdx >= 0 ? clean[subjectIdx] : `Ticket ${i + 1}`,
          description: descIdx >= 0 ? clean[descIdx] : '',
          status: 'open',
          priority: prioIdx >= 0 ? clean[prioIdx] : 'medium',
          tags: tagIdx >= 0 ? clean[tagIdx] : '',
          created_at_source: new Date().toISOString()
        }
      }).filter(t => t.subject)

      if (tickets.length === 0) {
        setRunStatus({ ok: false, msg: 'No valid tickets found. CSV needs a Subject or Title column.' })
        setUploading(false)
        return
      }

      const { error } = await supabase.from('tickets').insert(tickets)
      if (error) throw new Error(error.message)

      setRunStatus({ ok: true, msg: `${tickets.length} tickets uploaded. Click Run digest now to generate insights.` })
      setCsvFile(null)
    } catch (e) {
      setRunStatus({ ok: false, msg: e.message })
    }
    setUploading(false)
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text2)', fontSize:'.9rem' }}>Loading...</div>
    </>
  )

  const extraCSS = `
    .action-bar { display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; align-items:center; padding:18px; background:var(--surface); border:1px solid var(--border); border-radius:12px; }
    .action-title { font-size:.72rem; font-weight:700; color:var(--text3); font-family:var(--mono); text-transform:uppercase; letter-spacing:.06em; margin-bottom:12px; }
    .run-btn { display:inline-flex; align-items:center; gap:8px; background:var(--blue); color:#08090F; font-family:var(--sans); font-size:.875rem; font-weight:700; padding:11px 22px; border:none; border-radius:8px; cursor:pointer; transition:all .2s; box-shadow:0 0 20px rgba(59,126,255,.25); white-space:nowrap; }
    .run-btn:hover { opacity:.88; transform:translateY(-1px); }
    .run-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
    .divider-or { font-size:.72rem; color:var(--text3); white-space:nowrap; }
    .csv-wrap { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .csv-label { display:inline-flex; align-items:center; gap:6px; background:transparent; color:var(--text2); font-family:var(--sans); font-size:.83rem; font-weight:500; padding:10px 16px; border:1px solid var(--border2); border-radius:8px; cursor:pointer; transition:all .2s; }
    .csv-label:hover { border-color:var(--blue); color:var(--blue); }
    .csv-upload-btn { background:var(--green); color:#fff; font-family:var(--sans); font-size:.83rem; font-weight:700; padding:10px 18px; border:none; border-radius:8px; cursor:pointer; }
    .csv-upload-btn:disabled { opacity:.5; cursor:not-allowed; }
    .status-msg { padding:12px 16px; border-radius:8px; font-size:.83rem; line-height:1.5; margin-bottom:18px; }
    .status-ok { background:rgba(16,185,129,.08); color:var(--green); border:1px solid rgba(16,185,129,.2); }
    .status-err { background:var(--red-dim); color:var(--red); border:1px solid rgba(239,68,68,.2); }
    .empty-state { background:var(--surface); border:2px dashed var(--border2); border-radius:12px; padding:52px 32px; text-align:center; }
    .empty-icon { font-size:2.5rem; margin-bottom:14px; }
    .empty-title { font-size:1rem; font-weight:700; margin-bottom:8px; }
    .empty-sub { font-size:.83rem; color:var(--text2); line-height:1.7; max-width:380px; margin:0 auto; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spinner { display:inline-block; width:13px; height:13px; border:2px solid rgba(8,9,15,.3); border-top-color:#08090F; border-radius:50%; animation:spin .7s linear infinite; }
  `

  return (
    <>
      <Head>
        <title>Dashboard — Loopback</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS + extraCSS }} />

      <div className="dash-layout">
        {/* Sidebar */}
        <div className="dash-sidebar">
          <div className="dash-logo">
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--blue)', boxShadow:'0 0 8px var(--blue)' }} />
            Loopback
          </div>
          <a href="/dashboard" className="dash-nav-item active">📊 &nbsp;Digests</a>
          <a href="/dashboard/settings" className="dash-nav-item">⚙️ &nbsp;Settings</a>
          <a href="/dashboard/billing" className="dash-nav-item">💳 &nbsp;Billing</a>
          <div style={{ flex:1 }} />
          <div style={{ padding:'16px 20px', borderTop:'1px solid var(--border)' }}>
            <div style={{ fontSize:'.72rem', color:'var(--text3)', marginBottom:'8px', wordBreak:'break-all' }}>{userEmail}</div>
            <div onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
              style={{ fontSize:'.78rem', color:'var(--text3)', cursor:'pointer' }}>Sign out</div>
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
            <div className="stat-card"><div className="stat-label">Digests generated</div><div className="stat-val blue">{digests.length}</div></div>
            <div className="stat-card"><div className="stat-label">Tickets analysed</div><div className="stat-val">{digests.reduce((a, d) => a + (d.ticket_count || 0), 0)}</div></div>
            <div className="stat-card"><div className="stat-label">Support tool</div><div className="stat-val" style={{fontSize:'1rem'}}>{workspace?.freshdesk_domain ? '🟢 Freshdesk' : '⚪ Not connected'}</div></div>
            <div className="stat-card"><div className="stat-label">Slack</div><div className="stat-val" style={{fontSize:'1rem'}}>{workspace?.slack_webhook_url ? '🟢 Connected' : '⚪ Not connected'}</div></div>
          </div>

          {/* Action bar */}
          <div className="action-bar">
            <div style={{width:'100%'}}>
              <div className="action-title">Generate digest</div>
              <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
                <button className="run-btn" onClick={handleRunDigest} disabled={running}>
                  {running ? <><div className="spinner"></div>&nbsp;Running AI synthesis...</> : '⚡ Run digest now'}
                </button>
                <span className="divider-or">or upload tickets manually</span>
                <div className="csv-wrap">
                  <label className="csv-label">
                    📄 {csvFile ? csvFile.name : 'Choose CSV file'}
                    <input type="file" accept=".csv" style={{display:'none'}} onChange={e => setCsvFile(e.target.files[0])} />
                  </label>
                  {csvFile && (
                    <button className="csv-upload-btn" onClick={handleCsvUpload} disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Upload & ingest'}
                    </button>
                  )}
                </div>
              </div>
              <p style={{fontSize:'.73rem', color:'var(--text3)', marginTop:'10px', lineHeight:1.5}}>
                Run digest pulls from your connected Freshdesk. CSV upload accepts tickets from any support platform — export as CSV and upload here.
              </p>
            </div>
          </div>

          {runStatus && (
            <div className={`status-msg ${runStatus.ok ? 'status-ok' : 'status-err'}`}>
              {runStatus.ok ? '✓' : '✗'} &nbsp;{runStatus.msg}
            </div>
          )}

          {/* Digest history */}
          <div style={{ marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h2 style={{ fontSize:'.8rem', fontWeight:600, color:'var(--text3)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'.06em' }}>Digest History</h2>
            <span style={{ fontSize:'.72rem', color:'var(--text3)', fontFamily:'var(--mono)' }}>{digests.length} digests</span>
          </div>

          {digests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No digests yet</div>
              <div className="empty-sub">
                Upload a CSV of your support tickets above, or connect Freshdesk in Settings — then click <strong style={{color:'var(--blue)'}}>Run digest now</strong> to generate your first product intelligence report.
              </div>
            </div>
          ) : (
            digests.map((digest, i) => (
              <div key={digest.id} className="digest-item">
                <div className="di-header" onClick={() => setExpanded(expanded === i ? null : i)}>
                  <div>
                    <div className="di-week">Week of {formatDate(digest.week_of)}</div>
                    <div className="di-meta">{digest.ticket_count} tickets · {formatDate(digest.created_at)}</div>
                  </div>
                  <span style={{ color:'var(--text3)', fontSize:'.8rem' }}>{expanded === i ? '▲' : '▼'}</span>
                </div>
                {expanded === i && (
                  <div className="di-body">
                    {[
                      { key:'pain_point', label:'Top Pain Point', cls:'pain' },
                      { key:'feature_request', label:'Top Feature Request', cls:'feat' },
                      { key:'churn_signal', label:'Churn Signal', cls:'churn' },
                    ].map(({ key, label, cls }) => {
                      const item = digest[key]
                      if (!item) return null
                      return (
                        <div key={key} className="di-insight">
                          <div className={`di-label ${cls}`}>{label} · {item.severity?.toUpperCase()} · {item.ticket_count} tickets</div>
                          <div className="di-theme">{item.theme}</div>
                          {(item.supporting_quotes || []).slice(0,2).map((q, qi) => (
                            <div key={qi} className="di-quote">&ldquo;{q}&rdquo;</div>
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
