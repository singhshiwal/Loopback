import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'

// Step 4 (UI) + Step 9 support — lets an Owner invite Member/User by email
// and see the current roster. Non-owners are redirected away.
export default function Members() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState(null)
  const [members, setMembers] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [status, setStatus] = useState(null)

  async function loadMembers(workspaceId) {
    const { data } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('invited_at', { ascending: true })
    setMembers(data || [])
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const workspaceId = sessionStorage.getItem('lb_workspace_id')
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role, workspaces(*)')
        .eq('user_id', session.user.id)
        .eq('workspace_id', workspaceId)
        .single()

      if (!membership || membership.role !== 'owner') {
        router.push('/dashboard')
        return
      }

      setWorkspace(membership.workspaces)
      await loadMembers(workspaceId)
      setLoading(false)
    }
    load()
  }, [])

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    setStatus(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ workspace_id: workspace.id, email: email.trim(), role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite')
      setStatus({ ok: true, msg: `Invited ${email} as ${role}.` })
      setEmail('')
      await loadMembers(workspace.id)
    } catch (err) {
      setStatus({ ok: false, msg: err.message })
    }
    setInviting(false)
  }

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text2)', fontSize:'.9rem' }}>Loading...</div>
    </>
  )

  return (
    <>
      <Head><title>Members — Loopback</title></Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <div className="dash-layout">
        <div className="dash-sidebar">
          <div className="dash-logo">
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--blue)', boxShadow:'0 0 8px var(--blue)' }} />
            Loopback
          </div>
          <a href="/dashboard" className="dash-nav-item">📊 &nbsp;Digests</a>
          <a href="/dashboard/members" className="dash-nav-item active">👥 &nbsp;Members</a>
          <a href="/dashboard/settings" className="dash-nav-item">⚙️ &nbsp;Settings</a>
          <a href="/dashboard/billing" className="dash-nav-item">💳 &nbsp;Billing</a>
        </div>

        <div className="dash-main">
          <div className="dash-header">
            <h1 className="dash-title">Members — {workspace?.name}</h1>
            <p className="dash-sub">Owner-initiated only. Invite a teammate by email; they'll join this workspace once they sign up.</p>
          </div>

          <form onSubmit={handleInvite} style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:24, padding:18, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12 }}>
            <input
              type="email" placeholder="teammate@company.com" value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ flex:'1 1 240px', padding:'10px 12px', background:'var(--surface2, var(--surface))', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:'.85rem' }}
            />
            <select value={role} onChange={e => setRole(e.target.value)}
              style={{ padding:'10px 12px', background:'var(--surface2, var(--surface))', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:'.85rem' }}>
              <option value="member">Member — full ticket access</option>
              <option value="user">User — redacted view only</option>
            </select>
            <button className="run-btn" type="submit" disabled={inviting}>
              {inviting ? 'Sending...' : 'Send invite'}
            </button>
          </form>

          {status && (
            <div className={`status-msg ${status.ok ? 'status-ok' : 'status-err'}`} style={{ padding:'12px 16px', borderRadius:8, fontSize:'.83rem', marginBottom:18, background: status.ok ? 'rgba(16,185,129,.08)' : 'var(--red-dim)', color: status.ok ? 'var(--green)' : 'var(--red)' }}>
              {status.ok ? '✓' : '✗'} &nbsp;{status.msg}
            </div>
          )}

          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            {members.map(m => (
              <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize:'.85rem', fontWeight:600 }}>{m.email}</div>
                  <div style={{ fontSize:'.72rem', color:'var(--text3)' }}>
                    {m.accepted_at ? 'Active' : 'Invited — awaiting signup'}
                  </div>
                </div>
                <div style={{ fontSize:'.72rem', textTransform:'uppercase', fontFamily:'var(--mono)', color:'var(--text3)' }}>{m.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
