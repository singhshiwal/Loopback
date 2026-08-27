import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'
import { getPlan } from '../../lib/plans'

export default function Dashboard() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState(null)
  const [myWorkspaces, setMyWorkspaces] = useState([]) // Step 7: workspaces this user belongs to
  const [role, setRole] = useState(null) // Step 8: 'owner' | 'member' | 'user'
  const [digests, setDigests] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function loadWorkspace(ws, myRole) {
    setWorkspace(ws)
    setRole(myRole)
    sessionStorage.setItem('lb_workspace_id', ws.id)
    const plan = getPlan(ws.plan)
    // Free/Starter have no history dashboard per the pricing page — still show
    // the single latest digest (that's the core product), just not a history list.
    const historyLimit = plan.digestHistoryWeeks > 0 ? plan.digestHistoryWeeks : 1
    const { data: digs } = await supabase
      .from('digests').select('*').eq('workspace_id', ws.id)
      .order('created_at', { ascending: false }).limit(historyLimit)
    setDigests(digs || [])
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email)

      // Step 7/8: every workspace this user belongs to, with their role in each
      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('role, workspace_id, workspaces(*)')
        .eq('user_id', session.user.id)
        .not('accepted_at', 'is', null)

      const workspaces = (memberships || [])
        .filter(m => m.workspaces)
        .map(m => ({ ...m.workspaces, _role: m.role }))

      if (workspaces.length === 0) { router.push('/onboarding/company'); return }

      setMyWorkspaces(workspaces)
      const savedId = sessionStorage.getItem('lb_workspace_id')
      const active = workspaces.find(w => w.id === savedId) || workspaces[0]
      await loadWorkspace(active, active._role)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSwitchWorkspace(id) {
    const ws = myWorkspaces.find(w => w.id === id)
    if (!ws) return
    setLoading(true)
    await loadWorkspace(ws, ws._role)
    setLoading(false)
  }

  async function handleRunDigest() {
    if (!workspace) return
    setRunning(true)
    setRunStatus(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workspace_id: workspace.id })
      })
      const data = await res.json()
      if (data.success) {
        setRunStatus({ ok: true, msg: `Digest generated from ${data.ticket_count} tickets. Check your Slack and email.` })
        const plan = getPlan(workspace.plan)
        const historyLimit = plan.digestHistoryWeeks > 0 ? plan.digestHistoryWeeks : 1
        const { data: digs } = await supabase
          .from('digests').select('*').eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false }).limit(historyLimit)
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

      // Plan gate: cap to this workspace's per-run ticket limit rather than
      // rejecting the whole upload, so a bigger CSV still ingests up to the cap.
      const plan = getPlan(workspace.plan)
      const wasTruncated = tickets.length > plan.ticketsPerRun
      const cappedTickets = tickets.slice(0, plan.ticketsPerRun)

      const { error } = await supabase.from('tickets').insert(cappedTickets)
      if (error) throw new Error(error.message)

      setRunStatus({
        ok: true,
        msg: wasTruncated
          ? `${cappedTickets.length} of ${tickets.length} tickets uploaded (${plan.name} plan caps uploads at ${plan.ticketsPerRun}/run). Click Run digest now to generate insights.`
          : `${cappedTickets.length} tickets uploaded. Click Run digest now to generate insights.`,
      })
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

  const plan = getPlan(workspace?.plan)

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
          <a href="/dashboard/tickets" className="dash-nav-item">🎫 &nbsp;Tickets</a>
          {role === 'owner' && <a href="/dashboard/members" className="dash-nav-item">👥 &nbsp;Members</a>}
          <a href="/dashboard/settings" className="dash-nav-item">⚙️ &nbsp;Settings</a>
          <a href="/dashboard/billing" className="dash-nav-item">💳 &nbsp;Billing</a>
          <div style={{ flex:1 }} />
          {myWorkspaces.length > 1 && (
            <div style={{ padding:'0 20px 12px' }}>
              <label style={{ fontSize:'.68rem', color:'var(--text3)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'.06em' }}>Workspace</label>
              <select
                value={workspace?.id || ''}
                onChange={e => handleSwitchWorkspace(e.target.value)}
                style={{ width:'100%', marginTop:'6px', padding:'8px 10px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'6px', color:'var(--text)', fontSize:'.8rem' }}
              >
                {myWorkspaces.map(w => (
                  <option key={w.id} value={w.id}>{w.name} {w._role !== 'owner' ? `(${w._role})` : ''}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ padding:'16px 20px', borderTop:'1px solid var(--border)' }}>
            <div style={{ fontSize:'.68rem', color:'var(--text3)', marginBottom:'2px', textTransform:'uppercase', fontFamily:'var(--mono)' }}>{role}</div>
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

          {/* Action bar — Step 8: Owner/Member can ingest and run digests; User is view-only */}
          {role === 'user' ? (
            <div className="action-bar">
              <div style={{width:'100%'}}>
                <div className="action-title">View-only access</div>
                <p style={{fontSize:'.8rem', color:'var(--text2)', lineHeight:1.6, margin:0}}>
                  Your role on this workspace is <strong>User</strong>. You can view digest history below, but only an Owner or Member can run digests or upload tickets.
                </p>
              </div>
            </div>
          ) : (
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
          )}

          {runStatus && (
            <div className={`status-msg ${runStatus.ok ? 'status-ok' : 'status-err'}`}>
              {runStatus.ok ? '✓' : '✗'} &nbsp;{runStatus.msg}
            </div>
          )}

          {/* Ticket volume trend chart — Pro/Team only (F-09 in the PRD) */}
          {plan.trendChart && (
            <TicketTrendChart digests={digests} />
          )}

          {/* Digest history */}
          <div style={{ marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h2 style={{ fontSize:'.8rem', fontWeight:600, color:'var(--text3)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'.06em' }}>Digest History</h2>
            <span style={{ fontSize:'.72rem', color:'var(--text3)', fontFamily:'var(--mono)' }}>
              {plan.digestHistoryWeeks > 0 ? `${digests.length} of last ${plan.digestHistoryWeeks} weeks` : digests.length + ' digest'}
            </span>
          </div>

          {plan.digestHistoryWeeks === 0 && digests.length > 0 && (
            <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'rgba(59,126,255,.08)', border:'1px solid rgba(59,126,255,.25)', fontSize:'.78rem', color:'var(--text2)' }}>
              You're seeing your latest digest only. Digest history goes back 8 weeks on the Pro plan.
            </div>
          )}

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

// Ticket volume trend chart (F-09, Pro/Team plans only).
// Built from digest history already loaded — each digest records the
// ticket_count for its week, so no extra query is needed.
function TicketTrendChart({ digests }) {
  if (!digests || digests.length < 2) return null

  const points = [...digests].reverse() // oldest to newest, left to right
  const max = Math.max(...points.map(d => d.ticket_count || 0), 1)
  const W = 640, H = 120, padX = 10, padY = 16
  const step = (W - padX * 2) / Math.max(points.length - 1, 1)

  const coords = points.map((d, i) => {
    const x = padX + i * step
    const y = H - padY - ((d.ticket_count || 0) / max) * (H - padY * 2)
    return { x, y, count: d.ticket_count || 0, week: d.week_of }
  })

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')

  return (
    <div style={{ marginBottom:24, padding:'18px 20px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12 }}>
      <div style={{ fontSize:'.8rem', fontWeight:600, color:'var(--text3)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>
        Ticket Volume Trend
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}>
        <path d={path} fill="none" stroke="var(--blue, #3B7EFF)" strokeWidth="2" />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="3" fill="var(--blue, #3B7EFF)" />
            <title>{`${c.week}: ${c.count} tickets`}</title>
          </g>
        ))}
      </svg>
    </div>
  )
}
