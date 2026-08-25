import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'

// Step 8 — one component, but the data source depends on role:
// Owner/Member query the base `tickets` table; User queries the
// `ticket_dashboard` view, which redacts subject/description per
// the workspace's redaction_settings (Step 6).
export default function Tickets() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState(null)
  const [role, setRole] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

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

      if (!membership) { router.push('/dashboard'); return }
      setWorkspace(membership.workspaces)
      setRole(membership.role)

      const source = membership.role === 'user' ? 'ticket_dashboard' : 'tickets'
      const { data: rows, error } = await supabase
        .from(source)
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at_source', { ascending: false })
        .limit(50)

      if (error) console.error('Ticket load error:', error)
      setTickets(rows || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text2)', fontSize:'.9rem' }}>Loading...</div>
    </>
  )

  return (
    <>
      <Head><title>Tickets — Loopback</title></Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <div className="dash-layout">
        <div className="dash-sidebar">
          <div className="dash-logo">
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--blue)', boxShadow:'0 0 8px var(--blue)' }} />
            Loopback
          </div>
          <a href="/dashboard" className="dash-nav-item">📊 &nbsp;Digests</a>
          <a href="/dashboard/tickets" className="dash-nav-item active">🎫 &nbsp;Tickets</a>
          {role === 'owner' && <a href="/dashboard/members" className="dash-nav-item">👥 &nbsp;Members</a>}
          <a href="/dashboard/settings" className="dash-nav-item">⚙️ &nbsp;Settings</a>
        </div>

        <div className="dash-main">
          <div className="dash-header">
            <h1 className="dash-title">Tickets — {workspace?.name}</h1>
            <p className="dash-sub">
              {role === 'user'
                ? 'Redacted view — subject and description are masked per this workspace\'s redaction settings.'
                : 'Full ticket detail, visible to Owners and Members.'}
            </p>
          </div>

          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            {tickets.length === 0 ? (
              <div style={{ padding:32, textAlign:'center', color:'var(--text3)', fontSize:'.85rem' }}>No tickets yet.</div>
            ) : tickets.map(t => (
              <div key={t.id} style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                  <div style={{ fontSize:'.85rem', fontWeight:600 }}>{t.subject}</div>
                  <div style={{ fontSize:'.72rem', color:'var(--text3)', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>{t.priority} · {t.status}</div>
                </div>
                {t.description && <div style={{ fontSize:'.78rem', color:'var(--text2)', marginTop:6, lineHeight:1.5 }}>{t.description}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
