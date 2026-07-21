import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'
import { PLANS, PLAN_ORDER } from '../../lib/plans'

export default function Billing() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: ws } = await supabase
      .from('workspaces').select('*').eq('owner_email', session.user.email).single()
    if (!ws) { router.push('/onboarding/company'); return }
    setWorkspace(ws)
    setLoading(false)
  }

  async function call(url, body) {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, ...body }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed')
      setWorkspace(data.workspace)
      return data
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setBusy(false)
    }
  }

  async function handleChoose(planId) {
    const res = await call('/api/billing/checkout', { plan_id: planId })
    if (res) setMsg({ ok: true, text: `You're on the ${PLANS[planId].name} plan (test mode, no real charge).` })
  }

  async function handleCancel() {
    const res = await call('/api/billing/cancel')
    if (res) setMsg({ ok: true, text: 'Cancellation scheduled. Access continues until the current period ends.' })
  }

  async function handleSimulate(action) {
    const res = await fetch('/api/billing/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspace.id, action }),
    })
    const data = await res.json()
    if (data.workspace) {
      setWorkspace(data.workspace)
      setMsg({ ok: true, text: `Simulated: ${action}` })
    }
  }

  if (loading || !workspace) return null

  const currentIndex = PLAN_ORDER.indexOf(workspace.plan)

  return (
    <>
      <Head>
        <title>Billing — Loopback</title>
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
          <a href="/dashboard/settings" className="dash-nav-item">⚙️ &nbsp;Settings</a>
          <a href="/dashboard/billing" className="dash-nav-item active">💳 &nbsp;Billing</a>
        </div>
        <div className="dash-main">
          <div className="dash-header">
            <h1 className="dash-title">Billing</h1>
            <p className="dash-sub">
              Test mode: no real gateway is connected yet, plan changes here are simulated.
            </p>
          </div>

          {msg && <div className={`msg ${msg.ok ? 'msg-success' : 'msg-error'}`}>{msg.text}</div>}

          <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:28, padding:16, border:'1px solid var(--border)', borderRadius:10 }}>
            <div>
              <div className="stat-label">Current plan</div>
              <div className="stat-val blue" style={{ textTransform:'capitalize' }}>{workspace.plan}</div>
            </div>
            <div>
              <div className="stat-label">Status</div>
              <div className="stat-val" style={{ fontSize:'1rem', color: workspace.billing_status === 'past_due' ? 'var(--red)' : workspace.billing_status === 'active' ? 'var(--green)' : 'var(--text2)' }}>
                {workspace.billing_status}
                {workspace.cancel_at_period_end && ' (canceling)'}
              </div>
            </div>
            {workspace.current_period_end && (
              <div>
                <div className="stat-label">Renews / ends</div>
                <div className="stat-val" style={{ fontSize:'0.9rem' }}>
                  {new Date(workspace.current_period_end).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:28 }}>
            {PLAN_ORDER.map(id => {
              const plan = PLANS[id]
              const isCurrent = workspace.plan === id
              const idx = PLAN_ORDER.indexOf(id)
              return (
                <div key={id} style={{ border: isCurrent ? '1px solid var(--blue)' : '1px solid var(--border)', borderRadius:10, padding:20, background: isCurrent ? 'var(--blue-glow)' : 'var(--surface)' }}>
                  <div style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:4 }}>{plan.name}</div>
                  <div style={{ fontSize:'1.6rem', fontWeight:800, marginBottom:12 }}>
                    ${plan.price}{plan.interval && <span style={{ fontSize:'0.85rem', color:'var(--text2)', fontWeight:400 }}>/{plan.interval}</span>}
                  </div>
                  <ul style={{ listStyle:'none', padding:0, margin:'0 0 16px', color:'var(--text2)', fontSize:'0.85rem' }}>
                    {plan.features.map(f => <li key={f} style={{ marginBottom:6 }}>✓ {f}</li>)}
                  </ul>
                  {isCurrent ? (
                    <button className="btn btn-ghost" disabled style={{ width:'100%' }}>Current plan</button>
                  ) : id === 'free' ? (
                    <button className="btn btn-ghost" disabled={busy} onClick={handleCancel} style={{ width:'100%' }}>Downgrade</button>
                  ) : (
                    <button className="btn btn-primary" disabled={busy} onClick={() => handleChoose(id)} style={{ width:'100%' }}>
                      {idx > currentIndex ? 'Upgrade' : 'Switch'} to {plan.name}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {workspace.plan !== 'free' && !workspace.cancel_at_period_end && (
            <button className="btn btn-ghost" disabled={busy} onClick={handleCancel} style={{ maxWidth:240 }}>
              Cancel subscription
            </button>
          )}

          <div style={{ marginTop:40, padding:16, border:'1px dashed var(--border2)', borderRadius:10 }}>
            <div className="settings-section-title">Dev testing panel</div>
            <div className="settings-section-sub" style={{ marginBottom:12 }}>
              Simulates the webhook events a real gateway would send, so you can test renewal, failure, and reactivation flows without waiting on a billing cycle. Remove before launch.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-ghost" disabled={busy} onClick={() => handleSimulate('renew')}>Simulate renewal</button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => handleSimulate('fail')}>Simulate payment failure</button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => handleSimulate('reactivate')}>Simulate reactivation</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
